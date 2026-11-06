import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

type OpeningHour = {
  day: number;
  label: string;
  opensAt: string | null;
  closesAt: string | null;
  closed: boolean;
};

type ReservationSettings = {
  enabled: boolean;
  slotMinutes: number;
  maxCoversPerSlot: number;
  advanceDays: number;
  minGuests: number;
  maxGuests: number;
};

@Injectable()
export class ReservationAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  private dateParts(value: string | Date) {
    const source =
      value instanceof Date
        ? value.toISOString().slice(0, 10)
        : value.slice(0, 10);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(source);
    if (!match)
      throw new BadRequestException('La date de réservation est invalide.');
    const [, year, month, day] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day), 12);
    if (Number.isNaN(date.getTime()))
      throw new BadRequestException('La date de réservation est invalide.');
    if (
      date.getFullYear() !== Number(year) ||
      date.getMonth() !== Number(month) - 1 ||
      date.getDate() !== Number(day)
    )
      throw new BadRequestException('La date de réservation est invalide.');
    return { source, day: date.getDay(), date };
  }

  private restaurantNow(): number {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(Date.now()));
    const part = (name: string) => Number(parts.find(item => item.type === name)?.value);
    return Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second'));
  }

  private serviceTime(date: Date, hours = 0, minutes = 0): number {
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);
  }

  private minutes(value: string) {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
    if (!match)
      throw new BadRequestException('L’heure doit être au format HH:mm.');
    return Number(match[1]) * 60 + Number(match[2]);
  }

  private contains(hour: OpeningHour | null, time: number) {
    if (!hour || hour.closed || !hour.opensAt || !hour.closesAt) return false;
    const start = this.minutes(hour.opensAt);
    const end = this.minutes(hour.closesAt);
    return end > start ? time >= start && time < end : time >= start || time < end;
  }

  private async context(source: string, day: number) {
    const [regularHour, specialHour, setting, reservations] = await Promise.all([
      this.prisma.openingHour.findUnique({ where: { day } }),
      this.prisma.specialOpeningHour.findUnique({ where: { date: new Date(source) } }),
      this.prisma.siteSetting.findUnique({ where: { key: 'reservation' } }),
      this.prisma.reservation.findMany({
        where: {
          date: new Date(source),
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        },
        select: { id: true, time: true, guests: true },
      }),
    ]);
    const raw = (setting?.value ?? {}) as Partial<ReservationSettings>;
    const slotMinutes = Number(raw.slotMinutes);
    const maxCoversPerSlot = Number(raw.maxCoversPerSlot);
    return {
      hour: specialHour
        ? {
            day,
            label: specialHour.label || regularHour?.label || '',
            opensAt: specialHour.opensAt,
            closesAt: specialHour.closesAt,
            closed: specialHour.closed,
          }
        : regularHour,
      reservations,
      enabled: raw.enabled !== false,
      advanceDays: Number.isInteger(Number(raw.advanceDays)) ? Math.max(0, Number(raw.advanceDays)) : 60,
      minGuests: Math.max(1, Number(raw.minGuests) || 1),
      maxGuests: Math.min(30, Number(raw.maxGuests) || 30),
      slotMinutes: Number.isInteger(slotMinutes) && slotMinutes >= 15 ? slotMinutes : 30,
      maxCoversPerSlot: specialHour?.capacityOverride ??
        (Number.isInteger(maxCoversPerSlot) && maxCoversPerSlot > 0
          ? maxCoversPerSlot
          : 40),
    };
  }

  async assertReservable(
    date: string | Date,
    time: string,
    guests = 1,
    excludeReservationId?: string,
    allowPast = false,
  ) {
    const { source, day, date: serviceDate } = this.dateParts(date);
    const timeMinutes = this.minutes(time);
    const { hour: current, reservations, maxCoversPerSlot, enabled, advanceDays, minGuests, maxGuests } = await this.context(source, day);
    if (!enabled) throw new BadRequestException('Les réservations en ligne sont momentanément fermées.');
    if (guests < minGuests || guests > maxGuests)
      throw new BadRequestException(`Le nombre de personnes doit être compris entre ${minGuests} et ${maxGuests}.`);
    const now = this.restaurantNow();
    const today = Math.floor(now / 86_400_000) * 86_400_000;
    if (this.serviceTime(serviceDate) > today + advanceDays * 86_400_000)
      throw new BadRequestException(`Les réservations sont ouvertes ${advanceDays} jours à l’avance.`);
    if (this.contains(current, timeMinutes)) {
      const start = current?.opensAt ? this.minutes(current.opensAt) : 0;
      const end = current?.closesAt ? this.minutes(current.closesAt) : 0;
      const afterMidnight = end <= start && timeMinutes < end;
      const slotTime = this.serviceTime(serviceDate, Math.floor(timeMinutes / 60) + (afterMidnight ? 24 : 0), timeMinutes % 60);
      if (slotTime <= now && !allowPast)
        throw new BadRequestException('Ce créneau est déjà passé.');
      const reserved = reservations
        .filter((item) => item.time === time && item.id !== excludeReservationId)
        .reduce((total, item) => total + item.guests, 0);
      if (reserved + guests > maxCoversPerSlot)
        throw new BadRequestException(
          'Ce créneau n’a plus assez de places disponibles.',
        );
      return;
    }
    if (!current || current.closed || !current.opensAt || !current.closesAt) {
      throw new BadRequestException('Le restaurant est fermé à cette date.');
    }
    throw new BadRequestException(
      `Ce créneau est hors des horaires d’ouverture (${current.opensAt} – ${current.closesAt}).`,
    );
  }

  async slots(date: string, guests = 1, excludeReservationId?: string) {
    const { source, day, date: serviceDate } = this.dateParts(date);
    const { hour: current, reservations, slotMinutes, maxCoversPerSlot, enabled, advanceDays } =
      await this.context(source, day);
    const now = this.restaurantNow();
    const slots: Array<{ value: string; label: string; nextDay: boolean; remainingCovers: number }> = [];
    const append = (start: number, end: number) => {
      const first = Math.ceil(start / slotMinutes) * slotMinutes;
      for (let value = first; value < end; value += slotMinutes) {
        const time = `${String(Math.floor(value / 60) % 24).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
        const nextDay = value >= 24 * 60;
        const slotTime = this.serviceTime(serviceDate, Math.floor(value / 60), value % 60);
        const reserved = reservations
          .filter((item) => item.time === time && item.id !== excludeReservationId)
          .reduce((total, item) => total + item.guests, 0);
        const remainingCovers = Math.max(0, maxCoversPerSlot - reserved);
        if (slotTime > now && remainingCovers >= guests)
          slots.push({ value: time, label: time, nextDay, remainingCovers });
      }
    };
    const today = Math.floor(now / 86_400_000) * 86_400_000;
    const withinBookingWindow = this.serviceTime(serviceDate) <= today + advanceDays * 86_400_000;
    if (enabled && withinBookingWindow && current && !current.closed && current.opensAt && current.closesAt) {
      const start = this.minutes(current.opensAt);
      const end = this.minutes(current.closesAt);
      append(start, end > start ? end : end + 24 * 60);
    }
    return {
      date,
      closed: slots.length === 0,
      label: current?.label ?? '',
      opensAt: current?.opensAt ?? null,
      closesAt: current?.closesAt ?? null,
      slotMinutes,
      maxCoversPerSlot,
      advanceDays,
      enabled,
      slots,
    };
  }
}
