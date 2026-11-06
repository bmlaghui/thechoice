import { afterNextRender, Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FavoritesModal } from '../favorites-modal/favorites-modal';
import { FavoriteDish, FavoritesService } from '../favorites.service';

interface DishApi {
  slug: string;
  name: string;
  description: string;
  price: number | string;
  imageUrl?: string;
  imageAlt?: string;
  chefQuote?: string;
  badges?: string[];
  halal?: boolean;
  category: { slug: string; name: string };
  allergens?: Array<{ allergen: { name: string } }>;
  images?: Array<{ url: string; alt: string; order: number }>;
}

interface DishDetail extends FavoriteDish {
  imageAlt: string;
  allergens: string[];
  badges: string[];
  note: string;
  halal: boolean;
}

@Component({selector:'app-dish-detail-page',imports:[RouterLink,FavoritesModal],templateUrl:'./dish-detail-page.html',styleUrl:'./dish-detail-page.scss'})
export class DishDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  protected readonly favorites = inject(FavoritesService);
  protected readonly dish = signal<DishDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  constructor() {
    afterNextRender(() => this.load());
  }

  private load(): void {
    const slug = this.route.snapshot.paramMap.get('dishSlug') ?? '';
    const base = ['4200', '4201'].includes(globalThis.location?.port ?? '') ? 'http://localhost:3000/api/v1' : '/api/v1';
    this.http.get<DishApi>(`${base}/dishes/${encodeURIComponent(slug)}`).subscribe({
      next: item => {
        const primaryImage = item.imageUrl || item.images?.sort((a, b) => a.order - b.order)[0]?.url || '';
        this.dish.set({
          slug: item.slug,
          categorySlug: item.category.slug,
          name: item.name,
          description: item.description,
          price: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(Number(item.price)),
          image: primaryImage,
          imageAlt: item.imageAlt || item.name,
          allergens: item.allergens?.map(entry => entry.allergen.name) ?? [],
          badges: item.badges ?? [],
          note: item.chefQuote ?? '',
          halal: Boolean(item.halal),
        });
        this.loading.set(false);
      },
      error: response => {
        this.loading.set(false);
        if (response.status === 404) void this.router.navigateByUrl('/404', { replaceUrl: true });
        else this.error.set('Impossible de charger ce plat pour le moment.');
      },
    });
  }

  protected toggleFavorite(item: DishDetail): void { this.favorites.toggle(item); }
}
