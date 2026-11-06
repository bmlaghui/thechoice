import { BadRequestException } from '@nestjs/common';
jest.mock('./prisma.service', () => ({ PrismaService: class {} }));
import { ReservationAvailabilityService } from './reservation-availability.service';

describe('ReservationAvailabilityService', () => {
  const openingHour = {
    id: 'hour',
    day: 2,
    label: 'Mardi',
    opensAt: '12:00',
    closesAt: '23:30',
    closed: false,
  };
  const prisma = {
    openingHour: {
      findUnique: jest.fn(({ where }: { where: { day: number } }) =>
        Promise.resolve(where.day === 2 ? openingHour : null),
      ),
    },
    siteSetting: {
      findUnique: jest.fn(() =>
        Promise.resolve({ value: { slotMinutes: 30, maxCoversPerSlot: 40, advanceDays: 99999, minGuests: 1, maxGuests: 30 } }),
      ),
    },
    specialOpeningHour: { findUnique: jest.fn(() => Promise.resolve(null)) },
    reservation: { findMany: jest.fn(() => Promise.resolve([])) },
  } as any;
  const service = new ReservationAvailabilityService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.openingHour.findUnique.mockImplementation(({ where }: { where: { day: number } }) =>
      Promise.resolve(where.day === 2 ? openingHour : null),
    );
    prisma.specialOpeningHour.findUnique.mockResolvedValue(null);
    prisma.reservation.findMany.mockResolvedValue([]);
  });

  it('returns half-hour slots from configured opening hours', async () => {
    const result = await service.slots('2099-07-14');
    expect(result.slots[0].value).toBe('12:00');
    expect(result.slots.at(-1)?.value).toBe('23:00');
    expect(result.closed).toBe(false);
  });

  it('keeps after-midnight slots attached to the selected service day', async () => {
    prisma.openingHour.findUnique = jest.fn(() =>
      Promise.resolve({ ...openingHour, opensAt: '18:00', closesAt: '01:00' }),
    );
    const result = await service.slots('2099-07-14');
    expect(result.slots.at(-1)).toEqual(
      expect.objectContaining({ value: '00:30', label: '00:30', nextDay: true }),
    );
    await expect(service.assertReservable('2099-07-14', '00:30')).resolves.toBeUndefined();
  });

  it('accepts an open slot and rejects an out-of-hours slot', async () => {
    await expect(
      service.assertReservable('2099-07-14', '20:00'),
    ).resolves.toBeUndefined();
    await expect(
      service.assertReservable('2099-07-14', '10:00'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('removes a slot when its configured cover capacity is reached', async () => {
    prisma.reservation.findMany.mockResolvedValue([
      { id: 'one', time: '20:00', guests: 40 },
    ]);
    const result = await service.slots('2099-07-14', 2);
    expect(result.slots.some((slot) => slot.value === '20:00')).toBe(false);
    await expect(service.assertReservable('2099-07-14', '20:00', 2)).rejects.toThrow(
      'plus assez de places',
    );
  });

  it('gives an exceptional closure priority over weekly hours', async () => {
    prisma.specialOpeningHour.findUnique.mockResolvedValue({
      label: 'Fermeture privée', opensAt: null, closesAt: null, closed: true, capacityOverride: null,
    });
    const result = await service.slots('2099-07-14');
    expect(result.closed).toBe(true);
    expect(result.label).toBe('Fermeture privée');
    await expect(service.assertReservable('2099-07-14', '20:00')).rejects.toThrow(
      'fermé',
    );
  });
});
