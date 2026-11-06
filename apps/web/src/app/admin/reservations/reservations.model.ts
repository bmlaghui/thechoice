export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
export type CalendarView = 'day' | 'week' | 'month';
export interface Reservation {
  id: string;
  date: string;
  time: string;
  guests: number;
  name: string;
  email: string;
  phone: string;
  message?: string;
  internalNotes?: string;
  status: ReservationStatus;
}
export const STATUSES: { value: ReservationStatus; label: string; short: string }[] = [
  { value: 'PENDING', label: 'À confirmer', short: 'En attente' },
  { value: 'CONFIRMED', label: 'Confirmée', short: 'Confirmée' },
  { value: 'COMPLETED', label: 'Honorée · clients présents', short: 'Honorée' },
  { value: 'NO_SHOW', label: 'Clients absents', short: 'Absents' },
  { value: 'CANCELLED', label: 'Annulée', short: 'Annulée' },
];
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function localDay(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}
export function plusDays(date: Date, count: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
}
export function calendarRange(
  cursor: Date,
  view: CalendarView,
): { start: Date; end: Date; days: Date[] } {
  let start = localDay(dateKey(cursor));
  let count = 1;
  if (view === 'week') {
    start = plusDays(start, -((start.getDay() + 6) % 7));
    count = 7;
  }
  if (view === 'month') {
    start = new Date(cursor.getFullYear(), cursor.getMonth(), 1, 12);
    start = plusDays(start, -((start.getDay() + 6) % 7));
    count = 42;
  }
  return {
    start,
    end: plusDays(start, count),
    days: Array.from({ length: count }, (_, i) => plusDays(start, i)),
  };
}
export function isActive(reservation: Reservation): boolean {
  return reservation.status !== 'CANCELLED' && reservation.status !== 'NO_SHOW';
}
export function statusLabel(status: ReservationStatus): string {
  return STATUSES.find((item) => item.value === status)?.short ?? status;
}

export function arrivalState(
  item: Reservation,
  now: Date,
): { kind: 'soon' | 'due' | 'late' | ''; label: string } {
  if (item.status !== 'PENDING' && item.status !== 'CONFIRMED') return { kind: '', label: '' };
  // Compare wall-clock times in the restaurant's timezone, independently of the device timezone.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const value = (name: string) => parts.find((part) => part.type === name)?.value;
  const current = Date.parse(
    `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}:00Z`,
  );
  const booking = Date.parse(`${item.date.slice(0, 10)}T${item.time}:00Z`);
  const elapsed = Math.floor((current - booking) / 60_000);
  if (elapsed < -15) return { kind: '', label: '' };
  if (elapsed < 0) return { kind: 'soon', label: `Arrivée imminente · dans ${-elapsed} min` };
  if (elapsed <= 15)
    return {
      kind: 'due',
      label: elapsed ? `Arrivée à suivre · ${elapsed} min` : 'Arrivée prévue maintenant',
    };
  return { kind: 'late', label: 'Présence à vérifier · plus de 15 min' };
}

export function serviceQueue(
  items: Reservation[],
  now: Date,
): { label: string; items: Reservation[] }[] {
  const labels = [
    'Présences à vérifier',
    'Arrivées en cours',
    'À confirmer',
    'Prochaines arrivées',
    'Service terminé',
  ];
  const buckets = labels.map((label) => ({ label, items: [] as Reservation[] }));
  for (const item of [...items].sort(
    (a, b) => a.time.localeCompare(b.time) || a.name.localeCompare(b.name),
  )) {
    const state = arrivalState(item, now).kind;
    const rank = !['PENDING', 'CONFIRMED'].includes(item.status)
      ? 4
      : state === 'late'
        ? 0
        : state
          ? 1
          : item.status === 'PENDING'
            ? 2
            : 3;
    buckets[rank].items.push(item);
  }
  return buckets.filter((group) => group.items.length);
}
