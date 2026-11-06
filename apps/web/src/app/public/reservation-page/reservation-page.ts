import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PublicSiteService } from '../public-site.service';
import { RestaurantMap } from '../restaurant-map/restaurant-map';
import { Turnstile } from '../turnstile/turnstile';

type ReservationSlot = { value: string; label: string; nextDay: boolean; remainingCovers: number };

type SlotResponse = {
  closed: boolean;
  label: string;
  opensAt: string | null;
  closesAt: string | null;
  slots: ReservationSlot[];
};

@Component({
  selector: 'app-reservation-page',
  imports: [ReactiveFormsModule, RestaurantMap, Turnstile],
  templateUrl: './reservation-page.html',
  styleUrl: './reservation-page.scss',
})
export class ReservationPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly site = inject(PublicSiteService);
  private readonly base =
    ['4200', '4201'].includes(globalThis.location?.port ?? '') ? 'http://localhost:3000/api/v1' : '/api/v1';

  protected readonly sent = signal(false);
  protected readonly sending = signal(false);
  protected readonly loadingSlots = signal(false);
  protected readonly error = signal('');
  protected readonly turnstileToken = signal('');
  protected readonly pageContent = signal({eyebrow:'Réservation',title:'Réservez votre table',text:'Que ce soit pour un dîner en tête-à-tête, un repas entre amis ou un événement spécial, nous avons la table idéale pour vous.',imageUrl:''});
  protected readonly slots = signal<ReservationSlot[]>([]);
  protected readonly schedule = signal<SlotResponse | null>(null);
  protected readonly minDate = this.localDate(new Date());
  protected readonly maxDate = computed(() => { const date = new Date(); date.setDate(date.getDate() + this.site.reservationSettings().advanceDays); return this.localDate(date); });
  protected readonly guestOptions = computed(() => Array.from({ length: this.site.reservationSettings().maxGuests - this.site.reservationSettings().minGuests + 1 }, (_, index) => index + this.site.reservationSettings().minGuests));
  protected readonly form = this.fb.nonNullable.group({
    date: [this.minDate, Validators.required],
    time: ['', Validators.required],
    guests: [2, [Validators.required, Validators.min(1), Validators.max(30)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    message: ['', Validators.maxLength(1000)],
    consent: [false, Validators.requiredTrue],
    website: [''],
  });
  private readonly openedAt = Date.now();

  ngOnInit() {
    const query = this.route.snapshot.queryParamMap;
    const requestedDate = query.get('date');
    if (requestedDate && requestedDate >= this.minDate) this.form.controls.date.setValue(requestedDate);
    const guests = Number(query.get('guests'));
    if (Number.isInteger(guests) && guests >= 1 && guests <= 30) this.form.controls.guests.setValue(guests);
    if (this.isBrowser) {
      this.http.get<{blocks:Array<{type:string;content:unknown}>}>(`${this.base}/pages/reservation`).subscribe({next:page=>{const content=page?.blocks.find(block=>block.type==='hero')?.content;if(content&&typeof content==='object')this.pageContent.update(current=>({...current,...content}));},error:()=>undefined});
      this.loadSlots(this.form.controls.date.value);
      this.form.controls.date.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((date) => this.loadSlots(date));
      this.form.controls.guests.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.loadSlots(this.form.controls.date.value));
    }
  }

  protected selectSlot(value: string): void {
    this.form.controls.time.setValue(value);
    this.form.controls.time.markAsTouched();
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    this.error.set('');
    if (this.form.invalid || !this.slots().some((slot) => slot.value === this.form.controls.time.value)) return;
    this.sending.set(true);
    this.http.post(`${this.base}/reservations`, { ...this.form.getRawValue(), submittedAt: this.openedAt, turnstileToken: this.turnstileToken() }).subscribe({
      next: () => {
        this.sending.set(false);
        this.sent.set(true);
      },
      error: (response) => {
        this.sending.set(false);
        this.error.set(
          response.error?.message ||
            'La réservation n’a pas pu être envoyée. Réessayez dans un instant.',
        );
      },
    });
  }

  private loadSlots(date: string) {
    if (!date) return;
    this.loadingSlots.set(true);
    this.error.set('');
    this.http.get<SlotResponse>(`${this.base}/reservations/slots`, {
      params: { date, guests: this.form.controls.guests.value },
    }).subscribe({
      next: (result) => {
        this.schedule.set(result);
        this.slots.set(result.slots);
        const requestedTime = this.route.snapshot.queryParamMap.get('time');
        const current = requestedTime || this.form.controls.time.value;
        this.form.controls.time.setValue(result.slots.some((slot) => slot.value === current) ? current : '', { emitEvent: false });
        this.loadingSlots.set(false);
      },
      error: () => {
        this.schedule.set(null);
        this.slots.set([]);
        this.form.controls.time.setValue('', { emitEvent: false });
        this.loadingSlots.set(false);
        this.error.set('Les créneaux disponibles ne peuvent pas être chargés.');
      },
    });
  }

  private localDate(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
