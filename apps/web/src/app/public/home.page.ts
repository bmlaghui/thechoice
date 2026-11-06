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
import { NgOptimizedImage } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { PublicSiteService } from './public-site.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type ReservationSlot = { value: string; label: string; nextDay: boolean };
type SlotResponse = { closed: boolean; label: string; opensAt: string | null; closesAt: string | null; slots: ReservationSlot[] };

@Component({
  selector: 'app-home',
  imports: [NgOptimizedImage, RouterLink, ReactiveFormsModule],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  protected readonly site = inject(PublicSiteService);
  private readonly router = inject(Router);
  private readonly dishTrack = viewChild<ElementRef<HTMLElement>>('dishTrack');
  protected readonly activeSlide = signal(0);
  protected readonly slidesPaused = signal(false);
  protected readonly activeTestimonial = signal(0);
  protected readonly reservationSent = signal(false);
  protected readonly reservationSlots = signal<ReservationSlot[]>([]);
  protected readonly reservationSchedule = signal<SlotResponse | null>(null);
  protected readonly loadingReservationSlots = signal(false);
  protected readonly reservationError = signal('');
  protected readonly heroContent = signal({ title: 'More than food, a feeling', primaryCta: 'Réserver une table', secondaryCta: 'Découvrir la carte', imageUrl: '/images/hero/the-choice-table-user.jpeg', imageUrl2: '/images/hero/sharing-table-01.jpg', imageUrl3: '/images/hero/sharing-table-02.jpg' });
  protected readonly philosophyContent = signal({ eyebrow: 'Notre philosophie', title: 'Une cuisine sans frontières', text: 'Des inspirations du monde réunies autour du plaisir et du partage.', linkLabel: 'Notre histoire', imageUrl: '/images/events/noodles-lifestyle.jpg', imageAlt: 'Cuisine et partage autour des plats The Choice' });
  protected readonly chefContent = signal({ eyebrow: 'Notre chef', title: 'La passion dans chaque détail.', text: 'Notre chef sélectionne les meilleurs produits et imagine des recettes uniques où se rencontrent tradition et modernité.', signature: 'Chef Exécutif', linkLabel: 'Voir le menu complet', imageUrl: '/images/chef.png', imageAlt: 'Le chef dresse un plat avec précision' });
  protected readonly bestSellersContent = signal({ eyebrow: 'Nos incontournables', title: 'Nos best sellers', linkLabel: 'Voir le menu complet' });
  protected readonly ambianceContent = signal({ eyebrow: "L’ambiance", title: 'Un lieu élégant et chaleureux.', text: 'Une atmosphère feutrée, une lumière chaleureuse et des espaces pensés pour partager un moment à part.', linkLabel: 'Découvrir le restaurant', imageUrl: '/images/restaurant/unnamed (2).webp', imageAlt: 'Salle principale du restaurant', imageUrl2: '/images/restaurant/unnamed (3).webp', imageAlt2: 'Cocktails et bouchées à partager' });
  protected readonly testimonialsContent = signal({ eyebrow: 'Ils parlent de nous', title: 'Une expérience qui se raconte.' });
  protected readonly bookingContent = signal({ eyebrow: 'Réservation', title: 'Réservez votre table.', text: "Choisissez votre date, votre heure et profitez d’une expérience pensée dans les moindres détails.", submitLabel: 'Continuer la réservation' });
  protected readonly featuresContent = signal({ seatsLabel: 'Places assises', parkingLabel: 'Places de parking', openValue: 'Ouvert', openLabel: 'Selon les horaires', eventsValue: 'Événements', eventsLabel: 'Privatisations', certificationFallback: 'Halal' });
  protected readonly minReservationDate = this.localDate(new Date());
  protected readonly maxReservationDate = computed(() => { const date = new Date(); date.setDate(date.getDate() + this.site.reservationSettings().advanceDays); return this.localDate(date); });
  protected readonly guestOptions = computed(() => Array.from({ length: this.site.reservationSettings().maxGuests - this.site.reservationSettings().minGuests + 1 }, (_, index) => index + this.site.reservationSettings().minGuests));
  protected readonly slides = computed(() => [this.heroContent().imageUrl, this.heroContent().imageUrl2, this.heroContent().imageUrl3].filter(Boolean).map(image => ({ image })));
  protected readonly testimonials = signal<Array<{quote:string;name:string;context:string;rating:number;avatar:string}>>([]);
  protected readonly dishes = signal<Array<{name:string;desc:string;price:string;image:string}>>([]);
  protected readonly reservationForm = this.fb.nonNullable.group({
    date: [this.minReservationDate, Validators.required],
    time: ['', Validators.required],
    guests: [2, [Validators.required, Validators.min(1)]],
  });
  constructor(){
    afterNextRender(() => {
      const base=['4200', '4201'].includes(globalThis.location?.port ?? '')?'http://localhost:3000/api/v1':'/api/v1';
      this.http.get<Array<{quote:string;author:string;context:string;avatarUrl?:string;rating:number}>>(`${base}/testimonials`).subscribe({next:items=>this.testimonials.set(items.map(item=>({quote:item.quote,name:item.author,context:item.context,avatar:item.avatarUrl||'',rating:item.rating}))),error:()=>this.testimonials.set([])});
      this.http.get<Array<{name:string;description:string;price:number;imageUrl?:string;featured:boolean}>>(`${base}/dishes`).subscribe({next:items=>this.dishes.set(items.filter(item=>item.featured).map(item=>({name:item.name,desc:item.description,price:new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:0}).format(item.price),image:item.imageUrl||''}))),error:()=>this.dishes.set([])});
      this.http.get<{blocks:Array<{type:string;content:unknown}>}>(`${base}/pages/home`).subscribe({next:page=>{const apply=<T extends object>(type:string,target:{update:(updater:(value:T)=>T)=>void})=>{const content=page?.blocks.find(block=>block.type===type)?.content;if(content&&typeof content==='object')target.update(current=>({...current,...content}));};apply('hero',this.heroContent);apply('philosophy',this.philosophyContent);apply('chef',this.chefContent);apply('bestSellers',this.bestSellersContent);apply('ambiance',this.ambianceContent);apply('testimonialsHeader',this.testimonialsContent);apply('booking',this.bookingContent);apply('features',this.featuresContent);},error:()=>undefined});
      this.loadReservationSlots(this.reservationForm.controls.date.value);
      this.reservationForm.controls.date.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(date=>this.loadReservationSlots(date));
      this.reservationForm.controls.guests.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(()=>this.loadReservationSlots(this.reservationForm.controls.date.value));
    });
  }

  private readonly sliderEffect = afterNextRender(() => {
    if (globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = globalThis.setInterval(() => {
      if (!this.slidesPaused()) this.nextSlide();

    }, 5500);
    this.destroyRef.onDestroy(() => globalThis.clearInterval(timer));
  });

  protected nextSlide(): void {
    if (this.slides().length) this.activeSlide.update((index) => (index + 1) % this.slides().length);
  }
  protected nextTestimonial(): void {
    if (this.testimonials().length) this.activeTestimonial.update((index) => (index + 1) % this.testimonials().length);
  }
  protected previousTestimonial(): void {
    if (this.testimonials().length) this.activeTestimonial.update(
      (index) => (index - 1 + this.testimonials().length) % this.testimonials().length,
    );
  }
  protected scrollDishes(direction: -1 | 1): void {
    const track = this.dishTrack()?.nativeElement;
    if (track) track.scrollBy({ left: direction * track.clientWidth * 0.78, behavior: 'smooth' });
  }
  protected submitReservation(): void {
    this.reservationForm.markAllAsTouched();
    const value=this.reservationForm.getRawValue();
    if(this.reservationForm.invalid||!this.reservationSlots().some(slot=>slot.value===value.time))return;
    void this.router.navigate(['/reservation'],{queryParams:value});
  }

  private loadReservationSlots(date:string):void{
    if(!date)return;
    this.loadingReservationSlots.set(true);this.reservationError.set('');this.reservationForm.controls.time.setValue('',{emitEvent:false});
    const base=['4200', '4201'].includes(globalThis.location?.port ?? '')?'http://localhost:3000/api/v1':'/api/v1';
    this.http.get<SlotResponse>(`${base}/reservations/slots`,{params:{date,guests:this.reservationForm.controls.guests.value}}).subscribe({
      next:result=>{this.reservationSchedule.set(result);this.reservationSlots.set(result.slots);this.loadingReservationSlots.set(false);},
      error:()=>{this.reservationSchedule.set(null);this.reservationSlots.set([]);this.loadingReservationSlots.set(false);this.reservationError.set('Impossible de charger les horaires. Réessayez.');},
    });
  }

  private localDate(date:Date):string{return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
}
