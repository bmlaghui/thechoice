import { afterNextRender, Injectable, signal } from '@angular/core';

export interface FavoriteDish {
  slug: string;
  categorySlug: string;
  name: string;
  description: string;
  price: string;
  image: string;
}

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly storageKey = 'the-choice-favorites';
  readonly items = signal<FavoriteDish[]>([]);
  readonly modalOpen = signal(false);

  constructor() {
    afterNextRender(() => {
      const stored = globalThis.localStorage?.getItem(this.storageKey);
      if (stored) {
        try { this.items.set(JSON.parse(stored) as FavoriteDish[]); } catch { this.items.set([]); }
      }
    });
  }

  isFavorite(slug: string): boolean { return this.items().some(item => item.slug === slug); }

  toggle(dish: FavoriteDish): void {
    this.items.update(items => this.isFavorite(dish.slug) ? items.filter(item => item.slug !== dish.slug) : [...items, dish]);
    globalThis.localStorage?.setItem(this.storageKey, JSON.stringify(this.items()));
  }

  remove(slug: string): void {
    this.items.update(items => items.filter(item => item.slug !== slug));
    globalThis.localStorage?.setItem(this.storageKey, JSON.stringify(this.items()));
  }
}
