import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import argon2 from 'argon2';
import { PrismaService } from './prisma.service';
import { AuthUser } from './auth';
import { Prisma } from './generated/prisma/client';
import {
  CategoryDto,
  CreateReservationDto,
  DishDto,
  EventInquiryDto,
  EventOfferDto,
  EventInquiryUpdateDto,
  GalleryDto,
  ListQueryDto,
  OpeningHourDto,
  PageDto,
  ReservationUpdateDto,
  SocialLinkDto,
  UserDto,
  UserProfileDto,
  ChangePasswordDto,
  RolePolicyDto,
  TestimonialDto,
  SpecialOpeningHourDto,
} from './dto';
import { EmailService } from './email.service';
import { createHash, randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { mailTemplates } from './email-templates';
import { ReservationAvailabilityService } from './reservation-availability.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
    private readonly availability: ReservationAvailabilityService,
  ) {}
  private paging(q: ListQueryDto) {
    return { skip: (q.page - 1) * q.limit, take: q.limit };
  }
  async exportCsv(resource: string) {
    const escape = (value: unknown) => {
      let text = value instanceof Date ? value.toISOString() : String(value ?? '');
      if (/^[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text.replaceAll('"', '""')}"`;
    };
    let headers: string[];
    let rows: unknown[][];
    if (resource === 'reservations') {
      headers = ['Date', 'Heure', 'Nom', 'Email', 'Téléphone', 'Personnes', 'Statut', 'Message'];
      rows = (await this.prisma.reservation.findMany({ orderBy: [{ date: 'asc' }, { time: 'asc' }] })).map(item => [item.date, item.time, item.name, item.email, item.phone, item.guests, item.status, item.message]);
    } else if (resource === 'messages') {
      headers = ['Date', 'Nom', 'Email', 'Téléphone', 'Message', 'Lu'];
      rows = (await this.prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } })).map(item => [item.createdAt, item.name, item.email, item.phone, item.message, item.read ? 'Oui' : 'Non']);
    } else if (resource === 'events') {
      headers = ['Date de demande', 'Date événement', 'Nom', 'Email', 'Téléphone', 'Type', 'Personnes', 'Message'];
      rows = (await this.prisma.eventInquiry.findMany({ orderBy: { createdAt: 'desc' } })).map(item => [item.createdAt, item.eventDate, item.name, item.email, item.phone, item.eventType, item.guests, item.message]);
    } else throw new BadRequestException('Export inconnu.');
    return { filename: `${resource}-${new Date().toISOString().slice(0, 10)}.csv`, csv: [headers, ...rows].map(row => row.map(escape).join(';')).join('\n') };
  }
  media() { return this.prisma.mediaAsset.findMany({ orderBy: { createdAt: 'desc' } }); }
  createMedia(data: { filename:string; mimeType:string; size:number; url:string; alt:string }) { return this.prisma.mediaAsset.create({ data }); }
  async updateMedia(id:string,alt:string,user:AuthUser){const item=await this.prisma.mediaAsset.update({where:{id},data:{alt}});await this.audit(user,'UPDATE','MediaAsset',id);return item;}
  async deleteMedia(id:string,user:AuthUser){
    const item=await this.prisma.mediaAsset.findUniqueOrThrow({where:{id}});
    const [dish,category,gallery,testimonial,event,pages,settings]=await Promise.all([
      this.prisma.dish.count({where:{imageUrl:item.url}}),this.prisma.menuCategory.count({where:{imageUrl:item.url}}),this.prisma.galleryItem.count({where:{imageUrl:item.url}}),this.prisma.testimonial.count({where:{avatarUrl:item.url}}),this.prisma.eventOffer.count({where:{imageUrl:item.url}}),this.prisma.pageBlock.findMany({select:{content:true}}),this.prisma.siteSetting.findMany({select:{value:true}}),
    ]);
    if(dish||category||gallery||testimonial||event||pages.some(block=>JSON.stringify(block.content).includes(item.url))||settings.some(setting=>JSON.stringify(setting.value).includes(item.url)))throw new ConflictException('Cette image est encore utilisée sur le site. Remplacez-la avant de la supprimer.');
    await this.prisma.mediaAsset.delete({where:{id}});const directory=process.env.UPLOAD_DIR??resolve(process.cwd(),'../web/public/uploads');await unlink(resolve(directory,basename(item.url))).catch(()=>undefined);await this.audit(user,'DELETE','MediaAsset',id);return item;
  }
  private async audit(
    user: AuthUser,
    action: string,
    entity: string,
    entityId?: string,
    metadata?: object,
  ) {
    await this.prisma.auditLog.create({
      data: { userId: user.sub, action, entity, entityId, metadata },
    });
  }
  private result<T>(items: T[], total: number, q: ListQueryDto) {
    return {
      data: items,
      meta: {
        page: q.page,
        limit: q.limit,
        total,
        pages: Math.ceil(total / q.limit),
      },
    };
  }

  async dashboard() {
    const now = new Date(),
      today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const seriesStart = new Date(today);
    seriesStart.setDate(seriesStart.getDate() - 13);
    const [reservations, messages, inquiries, activeDishes, recent, mail] =
      await Promise.all([
        this.prisma.reservation.findMany({
          where: {
            OR: [
              { date: { gte: seriesStart } },
              { createdAt: { gte: seriesStart } },
            ],
          },
          select: {
            date: true,
            time: true,
            guests: true,
            status: true,
            createdAt: true,
          },
        }),
        this.prisma.contactMessage.findMany({
          where: { createdAt: { gte: seriesStart } },
          select: { createdAt: true, read: true },
        }),
        this.prisma.eventInquiry.findMany({
          where: { createdAt: { gte: monthStart } },
          select: { status: true },
        }),
        this.prisma.dish.count({ where: { available: true, deletedAt: null } }),
        this.prisma.auditLog.findMany({
          take: 8,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { email: true } } },
        }),
        this.email.status(),
      ]);
    const dateKey = (date: Date) => date.toISOString().slice(0, 10);
    const dailyActivity = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(seriesStart);
      date.setDate(seriesStart.getDate() + index);
      const key = dateKey(date);
      return {
        date: key,
        label: new Intl.DateTimeFormat('fr-FR', {
          weekday: 'short',
          day: 'numeric',
        }).format(date),
        reservations: reservations.filter(
          (item) => dateKey(item.createdAt) === key,
        ).length,
        messages: messages.filter((item) => dateKey(item.createdAt) === key)
          .length,
      };
    });
    const statusOrder = [
      'PENDING',
      'CONFIRMED',
      'COMPLETED',
      'CANCELLED',
      'NO_SHOW',
    ];
    const reservationStatus = statusOrder.map((status) => ({
      status,
      count: reservations.filter((item) => item.status === status).length,
    }));
    const popularTimes = [...new Set(reservations.map((item) => item.time))]
      .map((time) => ({
        time,
        count: reservations.filter((item) => item.time === time).length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    const todayItems = reservations.filter(
      (item) =>
        item.date >= today &&
        item.date < tomorrow &&
        item.status !== 'CANCELLED',
    );
    const monthItems = reservations.filter(
      (item) => item.createdAt >= monthStart,
    );
    const confirmed = monthItems.filter((item) =>
      ['CONFIRMED', 'COMPLETED'].includes(item.status),
    ).length;
    return {
      todayReservations: todayItems.length,
      todayCovers: todayItems.reduce((sum, item) => sum + item.guests, 0),
      upcomingReservations: reservations.filter(
        (item) =>
          item.date >= today && ['PENDING', 'CONFIRMED'].includes(item.status),
      ).length,
      pendingReservations: reservations.filter(
        (item) => item.date >= today && item.status === 'PENDING',
      ).length,
      unreadMessages: messages.filter((item) => !item.read).length,
      eventInquiries: inquiries.length,
      eventConversionRate: inquiries.length ? Math.round((inquiries.filter(item => item.status === 'WON').length / inquiries.length) * 100) : 0,
      eventPipeline: ['NEW', 'CONTACTED', 'QUOTED', 'WON', 'LOST'].map(status => ({ status, count: inquiries.filter(item => item.status === status).length })),
      activeDishes,
      monthReservations: monthItems.length,
      confirmationRate: monthItems.length
        ? Math.round((confirmed / monthItems.length) * 100)
        : 0,
      dailyActivity,
      reservationStatus,
      popularTimes,
      recentActivity: recent,
      mail,
    };
  }

  async pages(q: ListQueryDto) {
    const where = {
      deletedAt: null,
      ...(q.search
        ? { title: { contains: q.search, mode: 'insensitive' as const } }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.page.findMany({
        where,
        ...this.paging(q),
        orderBy: { updatedAt: 'desc' },
        include: { seo: true, blocks: { orderBy: { order: 'asc' } } },
      }),
      this.prisma.page.count({ where }),
    ]);
    return this.result(data, total, q);
  }
  async savePage(id: string | undefined, dto: PageDto, user: AuthUser) {
    const base = {
      title: dto.title,
      slug: dto.slug,
      status: dto.status,
      deletedAt: null,
      blocks: {
        create: (dto.blocks ?? []).map((b, i) => ({
          type: b.type,
          content: b.content as Prisma.InputJsonValue,
          order: b.order ?? i,
        })),
      },
    };
    const item = id
      ? await this.prisma.page.update({
          where: { id },
          data: {
            ...base,
            blocks: { deleteMany: {}, ...base.blocks },
            ...(dto.seo
              ? { seo: { upsert: { create: dto.seo, update: dto.seo } } }
              : {}),
          },
          include: { blocks: true, seo: true },
        })
      : await this.prisma.page.create({
          data: { ...base, ...(dto.seo ? { seo: { create: dto.seo } } : {}) },
          include: { blocks: true, seo: true },
        });
    await this.audit(user, id ? 'UPDATE' : 'CREATE', 'Page', item.id);
    return item;
  }
  async deletePage(id: string, user: AuthUser) {
    const item = await this.prisma.page.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.audit(user, 'DELETE', 'Page', id);
    return item;
  }

  async categories(q: ListQueryDto) {
    const where = q.search
      ? {
          OR: [
            { name: { contains: q.search, mode: 'insensitive' as const } },
            { slug: { contains: q.search, mode: 'insensitive' as const } },
            {
              description: { contains: q.search, mode: 'insensitive' as const },
            },
          ],
        }
      : {};
    const [data, total] = await Promise.all([
      this.prisma.menuCategory.findMany({
        where,
        ...this.paging(q),
        orderBy: { order: 'asc' },
        include: { _count: { select: { dishes: true } } },
      }),
      this.prisma.menuCategory.count({ where }),
    ]);
    return this.result(data, total, q);
  }
  async saveCategory(id: string | undefined, dto: CategoryDto, user: AuthUser) {
    const slug = this.slugify(dto.name);
    const duplicate = await this.prisma.menuCategory.findFirst({
      where: { slug, ...(id ? { NOT: { id } } : {}) },
    });
    if (duplicate)
      throw new ConflictException(
        `Une catégorie utilise déjà le slug « ${slug} »`,
      );
    const order = dto.order ?? (id ? undefined : (await this.prisma.menuCategory.count()) + 1);
    const data = { ...dto, slug, order };
    const item = id
      ? await this.prisma.menuCategory.update({ where: { id }, data })
      : await this.prisma.menuCategory.create({ data });
    await this.audit(user, id ? 'UPDATE' : 'CREATE', 'MenuCategory', item.id, {
      slug,
    });
    return item;
  }
  async deleteCategory(id: string, user: AuthUser) {
    const count = await this.prisma.dish.count({
      where: { categoryId: id, deletedAt: null },
    });
    if (count)
      throw new BadRequestException(
        'Cette catégorie contient encore des plats',
      );
    const item = await this.prisma.menuCategory.delete({ where: { id } });
    await this.audit(user, 'DELETE', 'MenuCategory', id);
    return item;
  }
  async reorderCategories(ids: string[], user: AuthUser) {
    await this.prisma.$transaction(
      ids.map((id, order) =>
        this.prisma.menuCategory.update({
          where: { id },
          data: { order: order + 1 },
        }),
      ),
    );
    await this.audit(user, 'REORDER', 'MenuCategory', undefined, { ids });
    return this.prisma.menuCategory.findMany({ orderBy: { order: 'asc' } });
  }

  async dishes(q: ListQueryDto) {
    const where = {
      deletedAt: null,
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search, mode: 'insensitive' as const } },
              { slug: { contains: q.search, mode: 'insensitive' as const } },
              {
                description: {
                  contains: q.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                category: {
                  name: { contains: q.search, mode: 'insensitive' as const },
                },
              },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.dish.findMany({
        where,
        ...this.paging(q),
        orderBy: { order: 'asc' },
        include: {
          category: true,
          images: true,
          allergens: { include: { allergen: true } },
        },
      }),
      this.prisma.dish.count({ where }),
    ]);
    return this.result(data, total, q);
  }
  allergens() {
    return this.prisma.allergen.findMany({ orderBy: { name: 'asc' } });
  }
  async saveDish(id: string | undefined, dto: DishDto, user: AuthUser) {
    const { allergenIds = [], images = [], ...base } = dto;
    const slug = this.slugify(dto.name);
    const duplicate = await this.prisma.dish.findFirst({
      where: { slug, ...(id ? { NOT: { id } } : {}) },
    });
    if (duplicate)
      throw new ConflictException(`Un plat utilise déjà le slug « ${slug} »`);
    const order =
      base.order ??
      (id
        ? undefined
        : (await this.prisma.dish.count({ where: { deletedAt: null } })) + 1);
    const data = {
      ...base,
      slug,
      order,
      deletedAt: null,
      allergens: {
        deleteMany: {},
        create: allergenIds.map((allergenId) => ({ allergenId })),
      },
      images: {
        deleteMany: {},
        create: images.map((image, i) => ({
          ...image,
          order: image.order ?? i,
        })),
      },
    };
    const item = id
      ? await this.prisma.dish.update({
          where: { id },
          data,
          include: { images: true, allergens: true },
        })
      : await this.prisma.dish.create({
          data,
          include: { images: true, allergens: true },
        });
    await this.audit(user, id ? 'UPDATE' : 'CREATE', 'Dish', item.id, { slug });
    return item;
  }
  async deleteDish(id: string, user: AuthUser) {
    const item = await this.prisma.dish.update({
      where: { id },
      data: { deletedAt: new Date(), available: false },
    });
    await this.audit(user, 'DELETE', 'Dish', id);
    return item;
  }
  async reorderDishes(ids: string[], user: AuthUser) {
    await this.prisma.$transaction(
      ids.map((id, order) =>
        this.prisma.dish.update({ where: { id }, data: { order: order + 1 } }),
      ),
    );
    await this.audit(user, 'REORDER', 'Dish', undefined, { ids });
    return this.prisma.dish.findMany({
      where: { deletedAt: null },
      orderBy: { order: 'asc' },
    });
  }

  async gallery(q: ListQueryDto) {
    const where = q.search
      ? {
          OR: [
            { title: { contains: q.search, mode: 'insensitive' as const } },
            { category: { contains: q.search, mode: 'insensitive' as const } },
            { alt: { contains: q.search, mode: 'insensitive' as const } },
            { imageUrl: { contains: q.search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const [data, total] = await Promise.all([
      this.prisma.galleryItem.findMany({
        where,
        ...this.paging(q),
        orderBy: { order: 'asc' },
      }),
      this.prisma.galleryItem.count({ where }),
    ]);
    return this.result(data, total, q);
  }
  async saveGallery(id: string | undefined, dto: GalleryDto, user: AuthUser) {
    const data = {
      ...dto,
      order:
        dto.order ??
        (id ? undefined : (await this.prisma.galleryItem.count()) + 1),
    };
    const item = id
      ? await this.prisma.galleryItem.update({ where: { id }, data })
      : await this.prisma.galleryItem.create({ data });
    await this.audit(user, id ? 'UPDATE' : 'CREATE', 'GalleryItem', item.id);
    return item;
  }
  async deleteGallery(id: string, user: AuthUser) {
    const item = await this.prisma.galleryItem.delete({ where: { id } });
    await this.audit(user, 'DELETE', 'GalleryItem', id);
    return item;
  }
  async reorderGallery(ids: string[], user: AuthUser) {
    await this.prisma.$transaction(
      ids.map((id, order) =>
        this.prisma.galleryItem.update({
          where: { id },
          data: { order: order + 1 },
        }),
      ),
    );
    await this.audit(user, 'REORDER', 'GalleryItem', undefined, { ids });
    return this.prisma.galleryItem.findMany({ orderBy: { order: 'asc' } });
  }
  async testimonials(q: ListQueryDto) {
    const where = q.search
      ? {
          OR: [
            { author: { contains: q.search, mode: 'insensitive' as const } },
            { context: { contains: q.search, mode: 'insensitive' as const } },
            { quote: { contains: q.search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const [data, total] = await Promise.all([
      this.prisma.testimonial.findMany({
        where,
        ...this.paging(q),
        orderBy: [{ featured: 'desc' }, { order: 'asc' }],
      }),
      this.prisma.testimonial.count({ where }),
    ]);
    return this.result(data, total, q);
  }
  async saveTestimonial(
    id: string | undefined,
    dto: TestimonialDto,
    user: AuthUser,
  ) {
    const data = {
      ...dto,
      order:
        dto.order ??
        (id ? undefined : (await this.prisma.testimonial.count()) + 1),
    };
    const item = id
      ? await this.prisma.testimonial.update({ where: { id }, data })
      : await this.prisma.testimonial.create({ data });
    await this.audit(user, id ? 'UPDATE' : 'CREATE', 'Testimonial', item.id);
    return item;
  }
  async deleteTestimonial(id: string, user: AuthUser) {
    const item = await this.prisma.testimonial.delete({ where: { id } });
    await this.audit(user, 'DELETE', 'Testimonial', id);
    return item;
  }
  async reorderTestimonials(ids: string[], user: AuthUser) {
    await this.prisma.$transaction(
      ids.map((id, order) =>
        this.prisma.testimonial.update({
          where: { id },
          data: { order: order + 1 },
        }),
      ),
    );
    await this.audit(user, 'REORDER', 'Testimonial', undefined, { ids });
    return this.prisma.testimonial.findMany({ orderBy: { order: 'asc' } });
  }
  async events(q: ListQueryDto) {
    const where = q.search
      ? { title: { contains: q.search, mode: 'insensitive' as const } }
      : {};
    const [data, total] = await Promise.all([
      this.prisma.eventOffer.findMany({
        where,
        ...this.paging(q),
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.eventOffer.count({ where }),
    ]);
    return this.result(data, total, q);
  }
  async saveEvent(id: string | undefined, dto: EventOfferDto, user: AuthUser) {
    const item = id
      ? await this.prisma.eventOffer.update({ where: { id }, data: dto })
      : await this.prisma.eventOffer.create({ data: dto });
    await this.audit(user, id ? 'UPDATE' : 'CREATE', 'EventOffer', item.id);
    return item;
  }
  async deleteEvent(id: string, user: AuthUser) {
    const item = await this.prisma.eventOffer.delete({ where: { id } });
    await this.audit(user, 'DELETE', 'EventOffer', id);
    return item;
  }

  async reservations(q: ListQueryDto) {
    const where = q.search
      ? {
          OR: [
            { name: { contains: q.search, mode: 'insensitive' as const } },
            { email: { contains: q.search, mode: 'insensitive' as const } },
            { phone: { contains: q.search } },
            { message: { contains: q.search, mode: 'insensitive' as const } },
            {
              internalNotes: {
                contains: q.search,
                mode: 'insensitive' as const,
              },
            },
            { time: { contains: q.search } },
          ],
        }
      : {};
    const [data, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        ...this.paging(q),
        orderBy: { date: 'desc' },
      }),
      this.prisma.reservation.count({ where }),
    ]);
    return this.result(data, total, q);
  }
  async createReservation(dto: CreateReservationDto, user: AuthUser) {
    await this.availability.assertReservable(dto.date, dto.time, dto.guests);
    const item = await this.prisma.reservation.create({
      data: { ...dto, date: new Date(dto.date) },
    });
    await this.audit(user, 'CREATE', 'Reservation', item.id);
    return item;
  }
  async updateReservation(
    id: string,
    dto: ReservationUpdateDto,
    user: AuthUser,
  ) {
    const current = await this.prisma.reservation.findUniqueOrThrow({
      where: { id },
    });
    await this.availability.assertReservable(
      dto.date ?? current.date,
      dto.time ?? current.time,
      dto.guests ?? current.guests,
      id,
    );
    const item = await this.prisma.reservation.update({
      where: { id },
      data: { ...dto, date: dto.date ? new Date(dto.date) : undefined },
    });
    if (dto.status && dto.status !== current.status && ['CONFIRMED', 'CANCELLED'].includes(dto.status)) {
      const template = mailTemplates.reservationStatus({
        name: item.name,
        date: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(item.date),
        time: item.time,
        guests: item.guests,
        confirmed: dto.status === 'CONFIRMED',
      });
      await this.email.send(item.email, template.subject, template.html, template.text).catch(() => undefined);
    }
    await this.audit(user, 'UPDATE', 'Reservation', id, {
      status: dto.status,
      date: dto.date,
      time: dto.time,
    });
    return item;
  }
  async deleteReservation(id: string, user: AuthUser) {
    const item = await this.prisma.reservation.delete({ where: { id } });
    await this.audit(user, 'DELETE', 'Reservation', id);
    return item;
  }
  async messages(q: ListQueryDto) {
    const where = q.search
      ? {
          OR: [
            { name: { contains: q.search, mode: 'insensitive' as const } },
            { email: { contains: q.search, mode: 'insensitive' as const } },
            { phone: { contains: q.search } },
            { message: { contains: q.search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const [data, total] = await Promise.all([
      this.prisma.contactMessage.findMany({
        where,
        ...this.paging(q),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contactMessage.count({ where }),
    ]);
    return this.result(data, total, q);
  }
  async readMessage(id: string, user: AuthUser) {
    const item = await this.prisma.contactMessage.update({
      where: { id },
      data: { read: true },
    });
    await this.audit(user, 'MARK_READ', 'ContactMessage', id);
    return item;
  }
  async unreadMessage(id: string, user: AuthUser) {
    const item = await this.prisma.contactMessage.update({
      where: { id },
      data: { read: false },
    });
    await this.audit(user, 'MARK_UNREAD', 'ContactMessage', id);
    return item;
  }
  async replyMessage(
    id: string,
    dto: { subject: string; html: string },
    user: AuthUser,
  ) {
    const message = await this.prisma.contactMessage.findUniqueOrThrow({
      where: { id },
    });
    const safeHtml = dto.html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
      .replace(/\son\w+\s*=\s*(["']).*?\1/gi, '');
    await this.email.send(message.email, dto.subject, safeHtml);
    const item = await this.prisma.contactMessage.update({
      where: { id },
      data: { read: true },
    });
    await this.audit(user, 'REPLY', 'ContactMessage', id, {
      to: message.email,
      subject: dto.subject,
    });
    return item;
  }
  async deleteMessage(id: string, user: AuthUser) {
    const item = await this.prisma.contactMessage.delete({ where: { id } });
    await this.audit(user, 'DELETE', 'ContactMessage', id);
    return item;
  }
  async inquiries(q: ListQueryDto) {
    const where = q.search
      ? {
          OR: [
            { name: { contains: q.search, mode: 'insensitive' as const } },
            { email: { contains: q.search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const [data, total] = await Promise.all([
      this.prisma.eventInquiry.findMany({
        where,
        ...this.paging(q),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.eventInquiry.count({ where }),
    ]);
    return this.result(data, total, q);
  }
  async createInquiry(dto: EventInquiryDto, user: AuthUser) {
    const { website: _website, submittedAt: _submittedAt, ...data } = dto;
    const item = await this.prisma.eventInquiry.create({
      data: {
        ...data,
        eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
      },
    });
    await this.audit(user, 'CREATE', 'EventInquiry', item.id);
    return item;
  }
  async updateInquiry(id: string, dto: EventInquiryUpdateDto, user: AuthUser) {
    const item = await this.prisma.eventInquiry.update({
      where: { id },
      data: {
        ...dto,
        eventDate: dto.eventDate ? new Date(dto.eventDate) : undefined,
      },
    });
    await this.audit(user, 'UPDATE', 'EventInquiry', id, dto);
    return item;
  }
  async deleteInquiry(id: string, user: AuthUser) {
    const item = await this.prisma.eventInquiry.delete({ where: { id } });
    await this.audit(user, 'DELETE', 'EventInquiry', id);
    return item;
  }

  settings() {
    return this.prisma.siteSetting.findMany({ orderBy: { key: 'asc' } });
  }
  async saveSetting(
    key: string,
    value: Record<string, unknown>,
    user: AuthUser,
  ) {
    if (key === 'reservation') {
      const slotMinutes = Number(value['slotMinutes']);
      const minGuests = Number(value['minGuests']);
      const maxGuests = Number(value['maxGuests']);
      const capacity = Number(value['maxCoversPerSlot']);
      if (![15, 30, 45, 60].includes(slotMinutes))
        throw new BadRequestException('Le pas des créneaux doit être 15, 30, 45 ou 60 minutes.');
      if (minGuests < 1 || maxGuests < minGuests || maxGuests > 30)
        throw new BadRequestException('Les limites de personnes sont invalides.');
      if (capacity < maxGuests)
        throw new BadRequestException('La capacité doit être au moins égale au maximum par réservation.');
    }
    const json = value as Prisma.InputJsonValue;
    const item = await this.prisma.siteSetting.upsert({
      where: { key },
      create: { key, value: json },
      update: { value: json },
    });
    await this.audit(user, 'UPSERT', 'SiteSetting', item.id, { key });
    return item;
  }
  hours() {
    return this.prisma.openingHour.findMany({ orderBy: { day: 'asc' } });
  }
  async saveHour(day: number, dto: OpeningHourDto, user: AuthUser) {
    const data = { ...dto, day };
    const item = await this.prisma.openingHour.upsert({
      where: { day },
      create: data,
      update: data,
    });
    await this.audit(user, 'UPSERT', 'OpeningHour', item.id, { day });
    return item;
  }
  specialHours() {
    return this.prisma.specialOpeningHour.findMany({ orderBy: { date: 'asc' } });
  }
  async saveSpecialHour(id: string | undefined, dto: SpecialOpeningHourDto, user: AuthUser) {
    if (!dto.closed && (!dto.opensAt || !dto.closesAt))
      throw new BadRequestException('Renseignez les heures d’ouverture et de fermeture.');
    const data = {
      ...dto,
      date: new Date(dto.date),
      opensAt: dto.closed ? null : dto.opensAt,
      closesAt: dto.closed ? null : dto.closesAt,
    };
    const item = id
      ? await this.prisma.specialOpeningHour.update({ where: { id }, data })
      : await this.prisma.specialOpeningHour.create({ data });
    await this.audit(user, id ? 'UPDATE' : 'CREATE', 'SpecialOpeningHour', item.id);
    return item;
  }
  async deleteSpecialHour(id: string, user: AuthUser) {
    const item = await this.prisma.specialOpeningHour.delete({ where: { id } });
    await this.audit(user, 'DELETE', 'SpecialOpeningHour', id);
    return item;
  }
  social() {
    return this.prisma.socialLink.findMany({ orderBy: { platform: 'asc' } });
  }
  async saveSocial(platform: string, dto: SocialLinkDto, user: AuthUser) {
    const data = { ...dto, platform };
    const item = await this.prisma.socialLink.upsert({
      where: { platform },
      create: data,
      update: data,
    });
    await this.audit(user, 'UPSERT', 'SocialLink', item.id, { platform });
    return item;
  }
  users() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        manuallyBlocked: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        lastLoginAt: true,
        passwordChangedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { email: 'asc' },
    });
  }
  async saveUser(id: string | undefined, dto: UserDto, user: AuthUser) {
    if (id === user.sub && dto.role !== 'SUPER_ADMIN')
      throw new BadRequestException(
        'Vous ne pouvez pas réduire votre propre rôle',
      );
    const base = {
      name: dto.name?.trim() || null,
      email: dto.email.toLowerCase(),
      role: dto.role,
    };
    const item = id
      ? await this.prisma.user.update({
          where: { id },
          data: base,
          select: { id: true, name: true, email: true, role: true },
        })
      : await this.prisma.user.create({
          data: {
            ...base,
            passwordHash: await argon2.hash(`${randomUUID()}Aa1!`),
            manuallyBlocked: true,
          },
          select: { id: true, name: true, email: true, role: true },
        });
    let invitationEmailSent: boolean | undefined;
    if (!id) {
      const token = `${randomUUID()}.${randomUUID()}`;
      const tokenHash = createHash('sha256').update(token).digest('hex');
      await this.prisma.userInvitation.deleteMany({
        where: { userId: item.id, usedAt: null },
      });
      await this.prisma.userInvitation.create({
        data: {
          userId: item.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 30 * 60_000),
        },
      });
      const link = `${this.config.get('FRONTEND_URL', 'http://localhost:4200')}/admin/invitation?token=${encodeURIComponent(token)}`;
      const invitation = mailTemplates.invitation({ name: item.name, link });
      invitationEmailSent = await this.email
        .send(item.email, invitation.subject, invitation.html, invitation.text)
        .then(() => true)
        .catch(() => false);
    }
    await this.audit(user, id ? 'UPDATE' : 'CREATE', 'User', item.id);
    return {
      ...item,
      ...(invitationEmailSent === undefined ? {} : { invitationEmailSent }),
    };
  }
  async resetUserPassword(
    id: string,
    dto: { password: string; confirmation: string },
    user: AuthUser,
  ) {
    if (dto.password !== dto.confirmation)
      throw new BadRequestException('La confirmation ne correspond pas');
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: {
          passwordHash: await argon2.hash(dto.password),
          passwordChangedAt: new Date(),
          failedLoginAttempts: 0,
          lockedUntil: null,
          manuallyBlocked: false,
          active: true,
        },
      }),
      this.prisma.refreshToken.deleteMany({ where: { userId: id } }),
    ]);
    await this.audit(user, 'RESET_PASSWORD', 'User', id);
    return { success: true };
  }
  async setUserBlocked(id: string, blocked: boolean, user: AuthUser) {
    if (id === user.sub)
      throw new BadRequestException(
        'Vous ne pouvez pas bloquer votre propre compte',
      );
    const item = await this.prisma.user.update({
      where: { id },
      data: {
        manuallyBlocked: blocked,
        lockedUntil: null,
        failedLoginAttempts: 0,
      },
    });
    if (blocked)
      await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
    await this.audit(user, blocked ? 'BLOCK' : 'UNBLOCK', 'User', id);
    return item;
  }
  async revokeUserSessions(id: string, user: AuthUser) {
    if (id === user.sub)
      throw new BadRequestException(
        'Utilisez la déconnexion pour votre propre session',
      );
    await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
    await this.audit(user, 'REVOKE_SESSIONS', 'User', id);
    return { success: true };
  }
  async deleteUser(id: string, user: AuthUser) {
    if (id === user.sub)
      throw new BadRequestException(
        'Vous ne pouvez pas supprimer votre propre compte',
      );
    const target = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    if (
      target.role === 'SUPER_ADMIN' &&
      (await this.prisma.user.count({ where: { role: 'SUPER_ADMIN' } })) <= 1
    )
      throw new BadRequestException(
        'Le dernier super administrateur ne peut pas être supprimé',
      );
    await this.prisma.user.delete({ where: { id } });
    await this.audit(user, 'DELETE', 'User', id);
    return { success: true };
  }
  profile(id: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        lastLoginAt: true,
        passwordChangedAt: true,
        createdAt: true,
      },
    });
  }
  async updateProfile(dto: UserProfileDto, user: AuthUser) {
    const item = await this.prisma.user.update({
      where: { id: user.sub },
      data: { name: dto.name?.trim() || null, email: dto.email.toLowerCase() },
      select: { id: true, name: true, email: true, role: true },
    });
    await this.audit(user, 'UPDATE_PROFILE', 'User', user.sub);
    return item;
  }
  async changePassword(dto: ChangePasswordDto, user: AuthUser) {
    if (dto.newPassword !== dto.confirmation)
      throw new BadRequestException('La confirmation ne correspond pas');
    if (dto.currentPassword === dto.newPassword)
      throw new BadRequestException(
        'Le nouveau mot de passe doit être différent',
      );
    const account = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.sub },
    });
    if (!(await argon2.verify(account.passwordHash, dto.currentPassword)))
      throw new BadRequestException('Mot de passe actuel incorrect');
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.sub },
        data: {
          passwordHash: await argon2.hash(dto.newPassword),
          passwordChangedAt: new Date(),
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      this.prisma.refreshToken.deleteMany({ where: { userId: user.sub } }),
    ]);
    await this.audit(user, 'CHANGE_PASSWORD', 'User', user.sub);
    return { success: true };
  }
  rolePolicies() {
    return this.prisma.rolePolicy.findMany({ orderBy: { role: 'asc' } });
  }
  async saveRolePolicy(
    role: UserDto['role'],
    dto: RolePolicyDto,
    user: AuthUser,
  ) {
    const item = await this.prisma.rolePolicy.upsert({
      where: { role },
      create: { role, ...dto },
      update: dto,
    });
    await this.audit(user, 'UPDATE_ROLE_POLICY', 'RolePolicy', item.id, {
      role,
    });
    return item;
  }
  private slugify(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
