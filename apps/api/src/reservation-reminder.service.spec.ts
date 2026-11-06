jest.mock('./prisma.service', () => ({ PrismaService: class {} }));
import { ReservationReminderService } from './reservation-reminder.service';

describe('ReservationReminderService', () => {
  it('claims and sends a single reminder in the 24-hour window', async () => {
    const now = new Date('2099-07-13T12:00:00.000Z');
    const prisma = {
      reservation: {
        findMany: jest.fn().mockResolvedValue([{ id: 'reservation', date: new Date('2099-07-14T00:00:00.000Z'), time: '14:00', guests: 4, name: 'Client', email: 'client@example.com' }]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn(),
      },
    } as any;
    const email = { send: jest.fn().mockResolvedValue(undefined) } as any;
    const config = { get: jest.fn() } as any;
    const service = new ReservationReminderService(prisma, email, config);
    await expect(service.run(now)).resolves.toBe(1);
    expect(prisma.reservation.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'reservation', reminderSentAt: null },
    }));
    expect(email.send).toHaveBeenCalledTimes(1);
  });

  it('releases the reminder claim when email delivery fails', async () => {
    const now = new Date('2099-07-13T12:00:00.000Z');
    const prisma = { reservation: {
      findMany: jest.fn().mockResolvedValue([{ id: 'reservation', date: new Date('2099-07-14T00:00:00.000Z'), time: '14:00', guests: 2, name: 'Client', email: 'client@example.com' }]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue(undefined),
    } } as any;
    const service = new ReservationReminderService(prisma, { send: jest.fn().mockRejectedValue(new Error('SMTP')) } as any, { get: jest.fn() } as any);
    await expect(service.run(now)).resolves.toBe(0);
    expect(prisma.reservation.update).toHaveBeenCalledWith({ where: { id: 'reservation' }, data: { reminderSentAt: null } });
  });
});
