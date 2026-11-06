import {
  Reservation,
  arrivalState,
  calendarRange,
  dateKey,
  localDay,
  plusDays,
  serviceQueue,
} from './reservations.model';

describe('Reservation calendar periods', () => {
  it('loads Monday through Sunday across a year boundary', () => {
    const range = calendarRange(localDay('2027-01-01'), 'week');
    expect(dateKey(range.start)).toBe('2026-12-28');
    expect(dateKey(range.end)).toBe('2027-01-04');
    expect(range.days).toHaveLength(7);
  });
  it('includes all six weeks and adjoining months for a month starting on Sunday', () => {
    const range = calendarRange(localDay('2026-11-15'), 'month');
    expect(dateKey(range.start)).toBe('2026-10-26');
    expect(dateKey(range.end)).toBe('2026-12-07');
    expect(range.days).toHaveLength(42);
    expect(range.days.map(dateKey)).toContain('2026-11-30');
  });
  it('keeps local calendar days contiguous through daylight saving changes', () => {
    const date = localDay('2026-03-28');
    expect(dateKey(plusDays(date, 1))).toBe('2026-03-29');
    expect(dateKey(plusDays(date, 2))).toBe('2026-03-30');
    expect(dateKey(date)).toBe('2026-03-28');
  });
});

describe('Arrival attention in the restaurant timezone', () => {
  const booking: Reservation = {
    id: 'test',
    date: '2026-11-06T00:00:00.000Z',
    time: '20:00',
    guests: 2,
    name: 'Client',
    email: 'test@example.test',
    phone: '0600000000',
    status: 'CONFIRMED',
  };
  it('starts the welcome window 15 minutes before Paris time', () => {
    expect(arrivalState(booking, new Date('2026-11-06T18:44:00Z')).kind).toBe('');
    expect(arrivalState(booking, new Date('2026-11-06T18:45:00Z')).kind).toBe('soon');
  });
  it('shows an alert after the grace period without mutating the status', () => {
    expect(arrivalState(booking, new Date('2026-11-06T19:15:00Z')).kind).toBe('due');
    expect(arrivalState(booking, new Date('2026-11-06T19:16:00Z')).kind).toBe('late');
    expect(booking.status).toBe('CONFIRMED');
  });
  it('stops alerts once attendance is recorded', () => {
    expect(
      arrivalState({ ...booking, status: 'COMPLETED' }, new Date('2026-11-06T19:30:00Z')).kind,
    ).toBe('');
    expect(
      arrivalState({ ...booking, status: 'NO_SHOW' }, new Date('2026-11-06T19:30:00Z')).kind,
    ).toBe('');
  });
});

describe('Service queue priorities', () => {
  it('prioritises unresolved arrivals, keeps handled bookings last and never mutates the source', () => {
    const base: Reservation = {
      id: 'base',
      date: '2026-11-06',
      time: '20:00',
      guests: 2,
      name: 'Client',
      email: '',
      phone: '',
      status: 'CONFIRMED',
    };
    const items: Reservation[] = [
      { ...base, id: 'upcoming', time: '22:00' },
      { ...base, id: 'done', status: 'COMPLETED' },
      { ...base, id: 'pending', time: '21:00', status: 'PENDING' },
      { ...base, id: 'due', time: '20:20' },
      { ...base, id: 'late' },
    ];
    const groups = serviceQueue(items, new Date('2026-11-06T19:20:00Z'));
    expect(groups.flatMap((group) => group.items.map((item) => item.id))).toEqual([
      'late',
      'due',
      'pending',
      'upcoming',
      'done',
    ]);
    expect(items[0].id).toBe('upcoming');
    expect(items[4].status).toBe('CONFIRMED');
  });
});
