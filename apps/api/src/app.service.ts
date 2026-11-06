import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from './prisma.service';
import { ContactDto, CreateReservationDto, EventInquiryDto, ManagedReservationUpdateDto } from './dto';
import { EmailService } from './email.service';
import { mailTemplates } from './email-templates';
import { ReservationAvailabilityService } from './reservation-availability.service';
import { CaptchaService } from './captcha.service';
@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly availability: ReservationAvailabilityService,
    private readonly captcha: CaptchaService,
  ) {}
  async settings() {
    const [settings, openingHours, socialLinks] = await Promise.all([
      this.prisma.siteSetting.findMany(),
      this.prisma.openingHour.findMany({ orderBy: { day: 'asc' } }),
      this.prisma.socialLink.findMany({
        where: { active: true },
        orderBy: { platform: 'asc' },
      }),
    ]);
    return {
      settings: Object.fromEntries(
        settings.map((item) => [item.key, item.value]),
      ),
      openingHours,
      socialLinks,
      turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || null,
    };
  }
  page(slug: string) {
    return this.prisma.page.findFirst({
      where: { slug, status: 'PUBLISHED', deletedAt: null },
      include: { blocks: { orderBy: { order: 'asc' } }, seo: true },
    });
  }
  category(slug: string) {
    return this.prisma.menuCategory.findFirst({
      where: { slug, active: true },
      include: {
        dishes: {
          where: { available: true, deletedAt: null },
          orderBy: { order: 'asc' },
        },
      },
    });
  }
  categories() {
    return this.prisma.menuCategory.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    });
  }
  dishes() {
    return this.prisma.dish.findMany({
      where: { available: true, deletedAt: null, category: { active: true } },
      include: { category: true, allergens: { include: { allergen: true } } },
      orderBy: { order: 'asc' },
    });
  }
  dish(slug: string) {
    return this.prisma.dish.findFirst({
      where: { slug, available: true, deletedAt: null, category: { active: true } },
      include: {
        category: true,
        images: true,
        allergens: { include: { allergen: true } },
      },
    });
  }
  gallery() {
    return this.prisma.galleryItem.findMany({
      where: { published: true },
      orderBy: { order: 'asc' },
    });
  }
  testimonials() {
    return this.prisma.testimonial.findMany({
      where: { published: true },
      orderBy: [{ featured: 'desc' }, { order: 'asc' }],
    });
  }
  events() {
    return this.prisma.eventOffer.findMany({ where: { published: true } });
  }
  async reserve(dto: CreateReservationDto) {
    if (dto.website || (dto.submittedAt && Date.now() - dto.submittedAt < 1500))
      return { received: true };
    await this.availability.assertReservable(dto.date, dto.time, dto.guests);
    const duplicate = await this.prisma.reservation.findFirst({
      where: {
        date: new Date(dto.date),
        time: dto.time,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        OR: [
          { email: { equals: dto.email, mode: 'insensitive' } },
          { phone: dto.phone },
        ],
      },
    });
    if (duplicate)
      throw new ConflictException(
        'Une réservation existe déjà pour ces coordonnées à ce créneau.',
      );
    await this.captcha.verify(dto.turnstileToken);
    const managementToken = randomBytes(32).toString('base64url');
    const managementTokenHash = createHash('sha256').update(managementToken).digest('hex');
    const { website: _website, submittedAt: _submittedAt, turnstileToken: _turnstileToken, ...data } = dto;
    const reservation = await this.prisma.reservation.create({
      data: { ...data, date: new Date(dto.date), managementTokenHash },
    });
    const displayDate = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'long',
    }).format(new Date(dto.date));
    const customer = mailTemplates.reservationCustomer({
      ...dto,
      date: displayDate,
      managementLink: `${process.env.PUBLIC_WEB_URL || 'http://localhost:4200'}/reservation/gestion/${managementToken}`,
    });
    const team = mailTemplates.reservationTeam({ ...dto, date: displayDate });
    await Promise.allSettled([
      this.email.send(
        dto.email,
        customer.subject,
        customer.html,
        customer.text,
      ),
      this.email.notifyRestaurant(
        team.subject,
        team.html,
        team.text,
        dto.email,
      ),
    ]);
    return reservation;
  }
  async managedReservation(token: string) {
    const reservation = await this.findManagedReservation(token);
    return { date: reservation.date, time: reservation.time, guests: reservation.guests, name: reservation.name, status: reservation.status };
  }
  async managedReservationSlots(token: string, date: string, guests = 1) {
    const reservation = await this.findManagedReservation(token);
    return this.availability.slots(date, Math.max(1, Math.min(30, guests)), reservation.id);
  }
  async cancelManagedReservation(token: string) {
    const reservation = await this.findManagedReservation(token);
    if (reservation.status === 'CANCELLED') return { cancelled: true };
    if (['COMPLETED', 'NO_SHOW'].includes(reservation.status))
      throw new BadRequestException('Cette réservation ne peut plus être annulée.');
    const serviceDate = new Date(reservation.date);
    const [hours, minutes] = reservation.time.split(':').map(Number);
    serviceDate.setHours(hours, minutes, 0, 0);
    if (serviceDate.getTime() <= Date.now())
      throw new BadRequestException('Cette réservation est déjà passée.');
    await this.prisma.reservation.update({ where: { id: reservation.id }, data: { status: 'CANCELLED' } });
    return { cancelled: true };
  }
  async updateManagedReservation(token: string, dto: ManagedReservationUpdateDto) {
    const reservation = await this.findManagedReservation(token);
    if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(reservation.status))
      throw new BadRequestException('Cette réservation ne peut plus être modifiée.');
    await this.availability.assertReservable(dto.date, dto.time, dto.guests, reservation.id);
    const item = await this.prisma.reservation.update({
      where: { id: reservation.id },
      data: { date: new Date(dto.date), time: dto.time, guests: dto.guests, status: 'PENDING', reminderSentAt: null },
    });
    const displayDate = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(item.date);
    const customer = mailTemplates.reservationCustomer({ name: item.name, date: displayDate, time: item.time, guests: item.guests, managementLink: `${process.env.PUBLIC_WEB_URL || 'http://localhost:4200'}/reservation/gestion/${token}` });
    const team = mailTemplates.reservationTeam({ name: item.name, email: item.email, phone: item.phone, date: displayDate, time: item.time, guests: item.guests, message: 'Réservation modifiée par le client depuis son lien sécurisé.' });
    await Promise.allSettled([
      this.email.send(item.email, customer.subject, customer.html, customer.text),
      this.email.notifyRestaurant(team.subject, team.html, team.text, item.email),
    ]);
    return { date: item.date, time: item.time, guests: item.guests, name: item.name, status: item.status };
  }
  private async findManagedReservation(token: string) {
    if (!token || token.length < 32) throw new NotFoundException('Lien invalide.');
    const managementTokenHash = createHash('sha256').update(token).digest('hex');
    const reservation = await this.prisma.reservation.findUnique({ where: { managementTokenHash } });
    if (!reservation) throw new NotFoundException('Réservation introuvable.');
    return reservation;
  }
  reservationSlots(date: string, guests = 1) {
    return this.availability.slots(date, Math.max(1, Math.min(30, guests)));
  }
  async contact(dto: ContactDto) {
    if (dto.website || (dto.submittedAt && Date.now() - dto.submittedAt < 1500))
      return { received: true };
    await this.captcha.verify(dto.turnstileToken);
    const { website: _website, submittedAt: _submittedAt, turnstileToken: _turnstileToken, ...data } = dto;
    const message = await this.prisma.contactMessage.create({ data });
    const customer = mailTemplates.contactCustomer(dto);
    const team = mailTemplates.contactTeam(dto);
    await Promise.allSettled([
      this.email.send(
        dto.email,
        customer.subject,
        customer.html,
        customer.text,
      ),
      this.email.notifyRestaurant(
        team.subject,
        team.html,
        team.text,
        dto.email,
      ),
    ]);
    return message;
  }
  async inquiry(dto: EventInquiryDto) {
    if (dto.website || (dto.submittedAt && Date.now() - dto.submittedAt < 1500))
      return { received: true };
    await this.captcha.verify(dto.turnstileToken);
    const { website: _website, submittedAt: _submittedAt, turnstileToken: _turnstileToken, ...data } = dto;
    const inquiry = await this.prisma.eventInquiry.create({
      data: {
        ...data,
        eventDate: dto.eventDate ? new Date(dto.eventDate) : undefined,
      },
    });
    const customer = mailTemplates.eventCustomer(dto);
    const team = mailTemplates.eventTeam(dto);
    await Promise.allSettled([
      this.email.send(
        dto.email,
        customer.subject,
        customer.html,
        customer.text,
      ),
      this.email.notifyRestaurant(
        team.subject,
        team.html,
        team.text,
        dto.email,
      ),
    ]);
    return inquiry;
  }
  dashboard() {
    return Promise.all([
      this.prisma.reservation.count(),
      this.prisma.contactMessage.count({ where: { read: false } }),
      this.prisma.dish.count({ where: { available: true } }),
    ]).then(([reservations, messages, dishes]) => ({
      reservations,
      messages,
      dishes,
    }));
  }
}
