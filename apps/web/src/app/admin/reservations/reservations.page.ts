import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT, DatePipe, registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { ReservationSwipe } from './reservation-swipe';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY, expand, reduce, Subscription } from 'rxjs';
import { AdminApiService, PageResult } from '../admin-api.service';
import {
  CalendarView,
  Reservation,
  ReservationStatus,
  STATUSES,
  arrivalState,
  calendarRange,
  dateKey,
  isActive,
  localDay,
  plusDays,
  statusLabel,
  serviceQueue,
} from './reservations.model';

registerLocaleData(localeFr);

type SlotResponse = {
  slots: { value: string; label: string; nextDay: boolean; remainingCovers?: number }[];
  closed: boolean;
};
@Component({
  selector: 'app-reservations',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, ReservationSwipe],
  templateUrl: './reservations.page.html',
  styleUrl: './reservations.page.scss',
  host: { '(document:fullscreenchange)': 'fullscreenChanged()' },
})
export class ReservationsPage {
  protected readonly api = inject(AdminApiService);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly detailsDialog = viewChild<ElementRef<HTMLDialogElement>>('detailsDialog');
  private readonly createDialog = viewChild<ElementRef<HTMLDialogElement>>('createDialog');
  private readonly moveDialog = viewChild<ElementRef<HTMLDialogElement>>('moveDialog');
  private readonly confirmationDialog =
    viewChild<ElementRef<HTMLDialogElement>>('confirmationDialog');
  private request?: Subscription;
  private slotsRequest?: Subscription;
  protected readonly statuses = STATUSES;
  protected readonly now = signal(new Date());
  protected readonly moving = signal<Reservation | null>(null);
  protected readonly moveForm = new FormGroup({
    date: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    time: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    guests: new FormControl(2, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(30)],
    }),
  });
  protected readonly serviceMode = signal(false);
  protected readonly expandedStats = signal(false);
  protected readonly undoAction = signal<{
    id: string;
    name: string;
    before: ReservationStatus;
    after: ReservationStatus;
  } | null>(null);
  protected readonly views: { value: CalendarView; label: string }[] = [
    { value: 'day', label: 'Jour' },
    { value: 'week', label: 'Semaine' },
    { value: 'month', label: 'Mois' },
  ];
  protected readonly weekdays = ['Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.', 'Dim.'];
  protected readonly cursor = signal(localDay(dateKey(new Date())));
  protected readonly selectedDate = signal(dateKey(new Date()));
  protected readonly view = signal<CalendarView>('week');
  protected readonly reservations = signal<Reservation[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly actionError = signal('');
  protected readonly toast = signal('');
  protected readonly search = signal('');
  protected readonly filter = signal('all');
  protected readonly service = signal('all');
  protected readonly selected = signal<Reservation | null>(null);
  protected readonly lastUpdated = signal<Date | null>(null);
  protected readonly fullscreen = signal(false);
  protected readonly canFullscreen = computed(() => !!this.document.fullscreenEnabled);
  protected readonly pendingAction = signal<{
    reservation: Reservation;
    status: ReservationStatus;
  } | null>(null);
  protected readonly notes = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(3000)],
  });
  protected readonly slots = signal<SlotResponse['slots']>([]);
  protected readonly loadingSlots = signal(false);
  protected readonly slotsError = signal('');
  protected readonly form = new FormGroup({
    date: new FormControl(dateKey(new Date()), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    time: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    guests: new FormControl(2, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(30)],
    }),
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    message: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] }),
    consent: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
  });
  protected readonly range = computed(() => calendarRange(this.cursor(), this.view()));
  protected readonly title = computed(() => {
    if (this.view() === 'day')
      return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(this.cursor());
    if (this.view() === 'month')
      return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(
        this.cursor(),
      );
    const start = this.range().start,
      end = plusDays(this.range().end, -1);
    return `${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(start)} — ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(end)}`;
  });
  protected readonly filtered = computed(() => {
    const query = this.search().toLocaleLowerCase('fr').trim();
    return this.reservations().filter(
      (item) =>
        (this.filter() === 'all' || item.status === this.filter()) &&
        (this.service() === 'all' ||
          (Number(item.time.slice(0, 2)) >= 6 && Number(item.time.slice(0, 2)) < 17
            ? this.service() === 'lunch'
            : this.service() === 'dinner')) &&
        (!query ||
          [item.name, item.email, item.phone, item.internalNotes ?? '', item.message ?? ''].some(
            (value) => value.toLocaleLowerCase('fr').includes(query),
          )),
    );
  });
  protected readonly days = computed(() =>
    this.range().days.map((date) => {
      const key = dateKey(date),
        items = this.filtered().filter((item) => item.date.slice(0, 10) === key);
      return {
        date,
        key,
        day: date.getDate(),
        today: key === dateKey(new Date()),
        outside: date.getMonth() !== this.cursor().getMonth(),
        items,
        covers: items.filter(isActive).reduce((sum, item) => sum + item.guests, 0),
      };
    }),
  );
  protected readonly selectedItems = computed(() =>
    this.filtered().filter((item) => item.date.slice(0, 10) === this.selectedDate()),
  );
  protected readonly dayGroups = computed(() => {
    const groups = new Map<string, Reservation[]>();
    for (const item of this.selectedItems())
      groups.set(item.time, [...(groups.get(item.time) ?? []), item]);
    return [...groups]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([time, items]) => ({ time, items }));
  });
  protected readonly summary = computed(() => {
    const items = this.filtered().filter(
      (item) =>
        this.view() !== 'month' || item.date.slice(0, 7) === dateKey(this.cursor()).slice(0, 7),
    );
    return {
      total: items.length,
      covers: items.filter(isActive).reduce((sum, item) => sum + item.guests, 0),
      pending: items.filter((item) => item.status === 'PENDING').length,
      expected: items.filter((item) => item.status === 'CONFIRMED').length,
      present: items.filter((item) => item.status === 'COMPLETED').length,
      absent: items.filter((item) => item.status === 'NO_SHOW').length,
    };
  });
  protected readonly selectedTitle = computed(() => localDay(this.selectedDate()));
  protected readonly serviceGroups = computed(() => {
    if (this.serviceMode()) return serviceQueue(this.selectedItems(), this.now());
    const groups = new Map<string, Reservation[]>();
    for (const item of this.selectedItems()) {
      const hour = Number(item.time.slice(0, 2));
      const name = hour >= 6 && hour < 17 ? 'Service du midi' : 'Service du soir';
      groups.set(name, [...(groups.get(name) ?? []), item]);
    }
    return [...groups].map(([label, items]) => ({ label, items }));
  });
  constructor() {
    afterNextRender(() => {
      if (globalThis.matchMedia('(max-width: 700px)').matches) this.view.set('day');
      this.load();
      const timer = setInterval(() => {
        this.now.set(new Date());
        if (
          !this.document.hidden &&
          !this.saving() &&
          !this.loading() &&
          !this.detailsDialog()?.nativeElement.open &&
          !this.createDialog()?.nativeElement.open &&
          !this.confirmationDialog()?.nativeElement.open &&
          !this.moveDialog()?.nativeElement.open
        )
          this.load(true);
      }, 60_000);
      this.destroyRef.onDestroy(() => clearInterval(timer));
    });
    this.destroyRef.onDestroy(() => {
      this.request?.unsubscribe();
      this.slotsRequest?.unsubscribe();
    });
  }
  protected load(quiet = false): void {
    this.request?.unsubscribe();
    this.error.set('');
    if (!quiet) this.loading.set(true);
    const { start, end } = this.range();
    const fetchPage = (page: number) =>
      this.api.get<PageResult<Reservation>>('/admin/reservations', {
        page,
        limit: 100,
        from: dateKey(start),
        to: dateKey(end),
      });
    this.request = fetchPage(1)
      .pipe(
        expand((result) =>
          result.meta.page < result.meta.pages ? fetchPage(result.meta.page + 1) : EMPTY,
        ),
        reduce((all, result) => [...all, ...result.data], [] as Reservation[]),
      )
      .subscribe({
        next: (items) => {
          this.reservations.set(items);
          this.lastUpdated.set(new Date());
          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);
          this.error.set(
            error.status === 403
              ? 'Votre rôle ne permet pas de gérer les réservations. Contactez un administrateur.'
              : 'Impossible de charger les réservations. Réessayez.',
          );
        },
      });
  }
  protected startService(): void {
    this.serviceMode.set(true);
    this.view.set('day');
    this.today();
  }
  protected setView(view: CalendarView): void {
    this.serviceMode.set(false);
    this.view.set(view);
    this.cursor.set(localDay(this.selectedDate()));
    this.load();
  }
  protected navigate(direction: number): void {
    const next = new Date(this.cursor());
    if (this.view() === 'month') {
      next.setDate(1);
      next.setMonth(next.getMonth() + direction);
    } else next.setDate(next.getDate() + direction * (this.view() === 'week' ? 7 : 1));
    this.cursor.set(next);
    this.selectedDate.set(dateKey(next));
    this.load();
  }
  protected today(): void {
    const now = localDay(dateKey(new Date()));
    this.cursor.set(now);
    this.selectedDate.set(dateKey(now));
    this.load();
  }
  protected pickDate(value: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    this.cursor.set(localDay(value));
    this.selectedDate.set(value);
    this.load();
  }
  protected pickDay(key: string): void {
    this.selectedDate.set(key);
    if (this.view() === 'day') {
      this.cursor.set(localDay(key));
      this.load();
    }
  }
  protected openDay(key: string): void {
    this.selectedDate.set(key);
    this.cursor.set(localDay(key));
    this.view.set('day');
    this.load();
  }
  protected label(status: ReservationStatus): string {
    return statusLabel(status);
  }
  protected initials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  }
  protected attention(item: Reservation): { kind: string; label: string } {
    return arrivalState(item, this.now());
  }
  protected canRecordAttendance(item: Reservation): boolean {
    return !!arrivalState(item, this.now()).kind;
  }
  protected openMove(item: Reservation): void {
    this.moving.set(item);
    this.moveForm.reset({ date: item.date.slice(0, 10), time: '', guests: item.guests });
    this.actionError.set('');
    this.moveDialog()?.nativeElement.showModal();
    this.loadMoveSlots();
  }
  protected closeMove(): void {
    if (!this.saving()) this.moveDialog()?.nativeElement.close();
  }
  protected loadMoveSlots(): void {
    const item = this.moving();
    if (!item) return;
    this.slotsRequest?.unsubscribe();
    this.slots.set([]);
    this.slotsError.set('');
    this.moveForm.controls.time.setValue('');
    const { date, guests } = this.moveForm.getRawValue();
    if (!date || !guests || guests < 1 || guests > 30) return;
    this.loadingSlots.set(true);
    this.slotsRequest = this.api
      .get<SlotResponse>(`/admin/reservations/${item.id}/slots`, { date, guests })
      .subscribe({
        next: (result) => {
          this.slots.set(result.slots);
          this.loadingSlots.set(false);
          if (!result.slots.length)
            this.slotsError.set('Aucun créneau disponible pour cette date et ce groupe.');
        },
        error: () => {
          this.loadingSlots.set(false);
          this.slotsError.set('Impossible de charger les disponibilités.');
        },
      });
  }
  protected move(): void {
    this.moveForm.markAllAsTouched();
    const item = this.moving();
    if (
      !item ||
      this.moveForm.invalid ||
      this.saving() ||
      !this.slots().some((slot) => slot.value === this.moveForm.controls.time.value)
    )
      return;
    this.saving.set(true);
    this.actionError.set('');
    this.api
      .patch<Reservation>(`/admin/reservations/${item.id}`, this.moveForm.getRawValue())
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.closeMove();
          this.detailsDialog()?.nativeElement.close();
          this.toast.set('Réservation déplacée · statut conservé');
          this.pickDate(updated.date.slice(0, 10));
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          this.actionError.set(
            this.apiError(error, 'Le déplacement a échoué. La réservation initiale est conservée.'),
          );
        },
      });
  }
  protected phoneLink(phone: string): string {
    return 'tel:' + phone.replace(/[^+\d]/g, '');
  }
  protected openDetails(item: Reservation): void {
    this.selected.set(item);
    this.notes.setValue(item.internalNotes ?? '');
    this.actionError.set('');
    this.detailsDialog()?.nativeElement.showModal();
  }
  protected closeDetails(): void {
    if (!this.saving()) this.detailsDialog()?.nativeElement.close();
  }
  protected requestStatus(item: Reservation, status: ReservationStatus): void {
    this.actionError.set('');
    if (status === 'NO_SHOW' || status === 'CANCELLED') {
      this.pendingAction.set({ reservation: item, status });
      this.confirmationDialog()?.nativeElement.showModal();
    } else this.updateStatus(item, status);
  }
  protected confirmStatus(): void {
    const action = this.pendingAction();
    if (action) this.updateStatus(action.reservation, action.status);
  }
  protected closeConfirmation(): void {
    if (!this.saving()) {
      this.confirmationDialog()?.nativeElement.close();
      this.pendingAction.set(null);
    }
  }
  private updateStatus(item: Reservation, status: ReservationStatus): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.actionError.set('');
    this.api.patch<Reservation>(`/admin/reservations/${item.id}`, { status }).subscribe({
      next: (updated) => {
        this.replace(updated);
        this.saving.set(false);
        this.closeConfirmation();
        this.undoAction.set(
          (status === 'COMPLETED' || status === 'NO_SHOW') && item.status !== status
            ? { id: item.id, name: item.name, before: item.status, after: status }
            : null,
        );
        this.toast.set(`${updated.name} · ${statusLabel(status)}`);
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.actionError.set(this.apiError(error, 'Le changement de statut a échoué.'));
      },
    });
  }
  protected undoAttendance(): void {
    const action = this.undoAction();
    if (!action || this.saving()) return;
    this.saving.set(true);
    this.actionError.set('');
    this.api
      .patch<Reservation>(`/admin/reservations/${action.id}`, {
        status: action.before,
        expectedStatus: action.after,
      })
      .subscribe({
        next: (updated) => {
          this.replace(updated);
          this.saving.set(false);
          this.undoAction.set(null);
          this.toast.set(`${action.name} · dernière action annulée`);
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          if (error.status === 409) {
            this.undoAction.set(null);
            this.load(true);
          }
          this.actionError.set(
            this.apiError(error, 'Impossible d’annuler cette action. Vérifiez la réservation.'),
          );
        },
      });
  }
  private replace(item: Reservation): void {
    this.reservations.update((items) => items.map((row) => (row.id === item.id ? item : row)));
    if (this.selected()?.id === item.id) this.selected.set(item);
  }
  protected saveNotes(): void {
    const item = this.selected();
    if (!item || this.saving() || this.notes.invalid) return;
    this.saving.set(true);
    this.actionError.set('');
    this.api
      .patch<Reservation>(`/admin/reservations/${item.id}`, { internalNotes: this.notes.value })
      .subscribe({
        next: (updated) => {
          this.replace(updated);
          this.saving.set(false);
          this.toast.set('Note interne enregistrée');
        },
        error: () => {
          this.saving.set(false);
          this.actionError.set('La note n’a pas été enregistrée.');
        },
      });
  }
  protected openCreate(): void {
    this.form.reset({
      date: this.selectedDate(),
      time: '',
      guests: 2,
      name: '',
      email: '',
      phone: '',
      message: '',
      consent: false,
    });
    this.actionError.set('');
    this.createDialog()?.nativeElement.showModal();
    this.loadSlots();
  }
  protected closeCreate(): void {
    if (!this.saving()) this.createDialog()?.nativeElement.close();
  }
  protected loadSlots(): void {
    this.slotsRequest?.unsubscribe();
    this.slots.set([]);
    this.slotsError.set('');
    this.form.controls.time.setValue('');
    const { date, guests } = this.form.getRawValue();
    if (!date || !guests || guests < 1 || guests > 30) return;
    this.loadingSlots.set(true);
    this.slotsRequest = this.api
      .get<SlotResponse>('/reservations/slots', { date, guests })
      .subscribe({
        next: (result) => {
          this.slots.set(result.slots);
          this.loadingSlots.set(false);
          if (!result.slots.length)
            this.slotsError.set(
              result.closed
                ? 'Restaurant fermé à cette date.'
                : 'Aucun créneau disponible pour ce groupe.',
            );
        },
        error: () => {
          this.loadingSlots.set(false);
          this.slotsError.set('Impossible de charger les créneaux disponibles.');
        },
      });
  }
  protected create(): void {
    this.form.markAllAsTouched();
    if (
      this.form.invalid ||
      this.saving() ||
      !this.slots().some((slot) => slot.value === this.form.controls.time.value)
    )
      return;
    this.saving.set(true);
    this.actionError.set('');
    this.api.post<Reservation>('/admin/reservations', this.form.getRawValue()).subscribe({
      next: (item) => {
        this.saving.set(false);
        this.closeCreate();
        this.toast.set('Réservation ajoutée · à confirmer');
        this.pickDate(item.date.slice(0, 10));
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.actionError.set(this.apiError(error, 'La réservation n’a pas été enregistrée.'));
      },
    });
  }
  private apiError(error: HttpErrorResponse, fallback: string): string {
    const body: unknown = error.error;
    if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string')
      return body.message;
    return fallback;
  }
  protected async closeWorkspace(): Promise<void> {
    if (this.document.fullscreenElement)
      await this.document.exitFullscreen().catch(() => undefined);
    await this.router.navigate(['/admin'], {
      queryParams: { module: 'Planning', workspace: 'standard' },
    });
  }
  protected async toggleFullscreen(): Promise<void> {
    try {
      if (this.document.fullscreenElement) await this.document.exitFullscreen();
      else await this.document.documentElement.requestFullscreen();
    } catch {
      this.toast.set(
        'Le navigateur ne permet pas le plein écran. L’agenda occupe déjà toute la fenêtre.',
      );
    }
  }
  protected fullscreenChanged(): void {
    this.fullscreen.set(!!this.document.fullscreenElement);
  }
  protected exportCsv(): void {
    const safe = (value: string | number) =>
      `"${String(value)
        .replace(/^[=+@\-\t\r]/, "'$&")
        .replaceAll('"', '""')}"`;
    const rows = [
      ['Date', 'Heure', 'Client', 'Personnes', 'Statut', 'Téléphone'],
      ...this.filtered().map((item) => [
        item.date.slice(0, 10),
        item.time,
        item.name,
        item.guests,
        this.label(item.status),
        item.phone,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(['\uFEFF' + rows.map((row) => row.map(safe).join(';')).join('\r\n')], {
        type: 'text/csv;charset=utf-8',
      }),
    );
    const link = this.document.createElement('a');
    link.href = url;
    link.download = `reservations-${dateKey(this.range().start)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
