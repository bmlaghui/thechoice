import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

type ManagedReservation = { date: string; time: string; guests: number; name: string; status: string };
type Slot = { value: string; label: string; nextDay: boolean };

@Component({
  selector: 'app-manage-reservation',
  imports: [RouterLink, ReactiveFormsModule],
  template: `
    <main class="manage">
      <p class="eyebrow">Votre réservation</p>
      <h1>Gérer ma table</h1>
      @if (loading()) { <p>Chargement…</p> }
      @else if (fatalError()) { <p class="error" role="alert">{{ fatalError() }}</p><a routerLink="/contact">Contacter le restaurant</a> }
      @else if (reservation(); as item) {
        <section>
          <p>Bonjour {{ item.name }},</p>
          <dl><div><dt>Date</dt><dd>{{ formatDate(item.date) }}</dd></div><div><dt>Heure</dt><dd>{{ item.time }}</dd></div><div><dt>Personnes</dt><dd>{{ item.guests }}</dd></div><div><dt>Statut</dt><dd>{{ statusLabel(item.status) }}</dd></div></dl>
          @if (!['CANCELLED','COMPLETED','NO_SHOW'].includes(item.status)) {
            <form [formGroup]="form" (ngSubmit)="save()">
              <h2>Modifier ma venue</h2>
              <div class="fields"><label>Date<input type="date" formControlName="date" [min]="minDate" (change)="loadSlots()"></label><label>Personnes<input type="number" min="1" max="30" formControlName="guests" (change)="loadSlots()"></label><label>Heure<select formControlName="time"><option value="">Choisir</option>@for(slot of slots();track slot.value){<option [value]="slot.value">{{slot.label}}{{slot.nextDay?' · lendemain':''}}</option>}</select></label></div>
              <p class="hint">Une modification repasse la demande en attente de confirmation.</p>
              @if(error()){<p class="error" role="alert">{{error()}}</p>} @if(saved()){<p class="saved" role="status">Modification enregistrée et transmise au restaurant.</p>}
              <div class="actions"><button type="submit" [disabled]="saving() || form.invalid || !slots().length">{{saving()?'Enregistrement…':'Enregistrer les modifications'}}</button><button class="danger" type="button" (click)="cancel()" [disabled]="cancelling()">{{ cancelling() ? 'Annulation…' : 'Annuler ma réservation' }}</button></div>
            </form>
          }
          @else { <p class="cancelled">Cette réservation est annulée.</p> }
        </section>
      }
    </main>`,
  styles: `:host{display:block;background:#050806;color:#f5f4ee;min-height:70vh}.manage{max-width:760px;margin:auto;padding:9rem 1.5rem 5rem}.eyebrow{color:#55a866;text-transform:uppercase;letter-spacing:.18em}h1{font-size:clamp(2.5rem,7vw,5rem);margin:.4rem 0 2rem}h2{margin:2rem 0 1rem;font-size:1.4rem}section{border:1px solid #24432d;background:#09110c;padding:clamp(1.4rem,4vw,2.5rem)}dl{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:#203527;margin:2rem 0}dl div{background:#09110c;padding:1rem}dt{color:#7da786;font-size:.72rem;text-transform:uppercase}dd{margin:.35rem 0 0;font-size:1.1rem}.fields{display:grid;grid-template-columns:1.2fr .8fr 1fr;gap:.7rem}.fields label{display:grid;gap:.45rem;color:#8eb397;font-size:.75rem;text-transform:uppercase}.fields input,.fields select{width:100%;min-height:48px;border:1px solid #31513a;background:#0d1710;color:white;padding:.7rem}.actions{display:flex;gap:.65rem;flex-wrap:wrap;margin-top:1rem}button{border:0;background:#3a914c;color:white;padding:1rem 1.4rem;cursor:pointer}button.danger{background:transparent;border:1px solid #8c4b45;color:#e8aaa4}button:disabled{opacity:.5}.error,.cancelled{color:#e6a784}.saved{color:#75c886}.hint{color:#8e9991;font-size:.82rem}@media(max-width:620px){dl,.fields{grid-template-columns:1fr}}`,
})
export class ManageReservation implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly base = ['4200', '4201'].includes(globalThis.location?.port ?? '') ? 'http://localhost:3000/api/v1' : '/api/v1';
  private token = '';
  protected readonly reservation = signal<ManagedReservation | null>(null);
  protected readonly loading = signal(true);
  protected readonly cancelling = signal(false);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly slots = signal<Slot[]>([]);
  protected readonly error = signal('');
  protected readonly fatalError = signal('');
  protected readonly minDate = this.localDate(new Date());
  protected readonly form = this.fb.nonNullable.group({ date: [this.minDate, Validators.required], time: ['', Validators.required], guests: [2, [Validators.required, Validators.min(1), Validators.max(30)]] });
  ngOnInit(): void { this.token = this.route.snapshot.paramMap.get('token') || ''; this.load(); }
  protected cancel(): void { if (!confirm('Confirmer l’annulation de cette réservation ?')) return; this.cancelling.set(true); this.http.patch(`${this.base}/reservations/manage/${encodeURIComponent(this.token)}/cancel`, {}).subscribe({ next: () => { this.cancelling.set(false); this.reservation.update(item => item ? { ...item, status: 'CANCELLED' } : item); }, error: response => { this.cancelling.set(false); this.error.set(response.error?.message || 'Annulation impossible.'); } }); }
  protected loadSlots(): void { const {date,guests}=this.form.getRawValue(); if(!date)return; this.http.get<{slots:Slot[]}>(`${this.base}/reservations/manage/${encodeURIComponent(this.token)}/slots`,{params:{date,guests}}).subscribe({next:result=>{this.slots.set(result.slots);const current=this.form.controls.time.value;this.form.controls.time.setValue(result.slots.some(slot=>slot.value===current)?current:'');},error:()=>{this.slots.set([]);this.error.set('Impossible de charger les créneaux.');}}); }
  protected save(): void { this.form.markAllAsTouched(); if(this.form.invalid)return; this.saving.set(true);this.saved.set(false);this.error.set('');this.http.patch<ManagedReservation>(`${this.base}/reservations/manage/${encodeURIComponent(this.token)}`,this.form.getRawValue()).subscribe({next:item=>{this.reservation.set(item);this.saving.set(false);this.saved.set(true);},error:response=>{this.saving.set(false);this.error.set(response.error?.message||'Modification impossible.');}}); }
  protected formatDate(value: string): string { return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(value)); }
  protected statusLabel(value: string): string { return ({ PENDING: 'En attente', CONFIRMED: 'Confirmée', CANCELLED: 'Annulée', COMPLETED: 'Terminée', NO_SHOW: 'Non présentée' } as Record<string,string>)[value] || value; }
  private load(): void { this.http.get<ManagedReservation>(`${this.base}/reservations/manage/${encodeURIComponent(this.token)}`).subscribe({ next: item => { this.reservation.set(item);this.form.setValue({date:this.localDate(new Date(item.date)),time:item.time,guests:item.guests});this.loadSlots();this.loading.set(false); }, error: () => { this.fatalError.set('Ce lien est invalide ou a expiré.'); this.loading.set(false); } }); }
  private localDate(date:Date):string{return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
}
