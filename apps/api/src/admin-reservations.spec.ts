import 'reflect-metadata';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
jest.mock('./prisma.service', () => ({ PrismaService: class {} }));
import { AdminService } from './admin.service';
import { PrismaService } from './prisma.service';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';
import { ReservationAvailabilityService } from './reservation-availability.service';
import { ListQueryDto } from './dto';
import { Role } from './generated/prisma/enums';

describe('Reservation desk API', () => {
  const past = {
    id: 'booking',
    date: new Date('2025-01-01'),
    time: '20:00',
    guests: 2,
    name: 'Client',
    email: 'guest@example.test',
    status: 'CONFIRMED',
  };
  const prisma = {
    reservation: {
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  };
  const availability = { assertReservable: jest.fn(), slots: jest.fn() };
  const mail = { send: jest.fn() };
  const service = new AdminService(
    prisma as unknown as PrismaService,
    mail as unknown as EmailService,
    {} as ConfigService,
    availability as unknown as ReservationAvailabilityService,
  );
  const user = {
    sub: 'manager',
    email: 'manager@example.test',
    role: Role.EDITOR,
  };
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.reservation.findUniqueOrThrow.mockResolvedValue(past);
    prisma.reservation.update.mockResolvedValue({ ...past, status: 'NO_SHOW' });
    prisma.reservation.findMany.mockResolvedValue([]);
    prisma.reservation.count.mockResolvedValue(151);
    prisma.auditLog.create.mockResolvedValue({});
    mail.send.mockResolvedValue({});
    availability.assertReservable.mockResolvedValue(undefined);
  });
  it('can mark a past reservation absent without rebooking its expired slot', async () => {
    await service.updateReservation('booking', { status: 'NO_SHOW' }, user);
    expect(availability.assertReservable).not.toHaveBeenCalled();
    expect(prisma.reservation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'NO_SHOW' }),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });
  it('rejects undo when another team member already changed attendance', async () => {
    await expect(service.updateReservation('booking', { status: 'PENDING', expectedStatus: 'COMPLETED' }, user)).rejects.toThrow('modifiée');
    expect(prisma.reservation.update).not.toHaveBeenCalled();
  });
  it('refuses undo if attendance changes between reading and writing', async () => {
    prisma.reservation.findUniqueOrThrow.mockResolvedValue({ ...past, status: 'COMPLETED' });
    prisma.reservation.update.mockRejectedValueOnce(new PrismaClientKnownRequestError('Changed', { code: 'P2025', clientVersion: '7.8.0' }));
    await expect(service.updateReservation('booking', { status: 'CONFIRMED', expectedStatus: 'COMPLETED' }, user)).rejects.toThrow('modifiée');
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });
  it('restores attendance with capacity checks while allowing a past slot', async () => {
    prisma.reservation.findUniqueOrThrow.mockResolvedValue({ ...past, status: 'NO_SHOW' });
    await service.updateReservation('booking', { status: 'CONFIRMED', expectedStatus: 'NO_SHOW' }, user);
    expect(availability.assertReservable).toHaveBeenCalledWith(past.date, past.time, past.guests, 'booking', true);
    expect(prisma.reservation.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'booking', status: 'NO_SHOW' }, data: expect.not.objectContaining({ expectedStatus: expect.anything() }) }));
    expect(mail.send).not.toHaveBeenCalled();
  });
  it('still checks availability when changing a booking time', async () => {
    await service.updateReservation('booking', { time: '21:00' }, user);
    expect(availability.assertReservable).toHaveBeenCalledWith(
      past.date,
      '21:00',
      2,
      'booking',
    );
  });
  it('can save notes on a past booking without checking a new slot', async () => {
    await service.updateReservation(
      'booking',
      { internalNotes: 'Client rappelé' },
      user,
    );
    expect(availability.assertReservable).not.toHaveBeenCalled();
  });
  it('excludes the moved reservation from its own slot occupancy', async () => {
    availability.slots.mockResolvedValue({ slots: [] });
    await service.reservationSlots('booking', {
      date: '2026-12-05',
      guests: 4,
    });
    expect(availability.slots).toHaveBeenCalledWith('2026-12-05', 4, 'booking');
  });
  it('filters by an exclusive period end and keeps paging beyond 100 bookings', async () => {
    const result = await service.reservations(
      Object.assign(new ListQueryDto(), {
        from: '2026-11-01',
        to: '2026-12-01',
        page: 2,
        limit: 100,
      }),
    );
    expect(prisma.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 100,
        take: 100,
        where: {
          date: { gte: new Date('2026-11-01'), lt: new Date('2026-12-01') },
        },
      }),
    );
    expect(result.meta.pages).toBe(2);
  });
});
