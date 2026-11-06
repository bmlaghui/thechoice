import { afterNextRender, Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { FavoritesModal } from '../favorites-modal/favorites-modal';
import { FavoriteDish, FavoritesService } from '../favorites.service';

interface MenuDish {
  slug: string;
  name: string;
  description: string;
  price: string;
  image: string;
}
interface MenuSection {
  slug: string;
  category: string;
  eyebrow: string;
  title: string;
  intro: string;
  image: string;
  dishes: MenuDish[];
}
interface CategoryApi { id:string; slug:string; name:string; eyebrow?:string; description?:string; imageUrl?:string; }
interface DishApi { slug:string; name:string; description:string; price:number|string; imageUrl?:string; category:{id:string;slug:string;name:string}; }

@Component({selector:'app-menu-page',imports:[RouterLink,FavoritesModal],templateUrl:'./menu-page.html',styleUrl:'./menu-page.scss'})
export class MenuPage {
  private readonly http = inject(HttpClient);
  protected readonly favorites = inject(FavoritesService);
  protected readonly active = signal('');
  protected readonly hero = signal({ eyebrow:'', title:'', text:'', imageUrl:'' });
  protected readonly sections = signal<MenuSection[]>([]);
  protected readonly categories = computed(() => this.sections().map(section => section.category));
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly activeSection = computed(() => this.sections().find(section => section.category === this.active()));

  constructor() {
    afterNextRender(() => this.load());
  }

  private load(): void {
    const base = ['4200', '4201'].includes(globalThis.location?.port ?? '') ? 'http://localhost:3000/api/v1' : '/api/v1';
    forkJoin({
      categories: this.http.get<CategoryApi[]>(`${base}/menu/categories`),
      dishes: this.http.get<DishApi[]>(`${base}/dishes`),
      page: this.http.get<{blocks:Array<{type:string;content:unknown}>}>(`${base}/pages/menu`),
    }).subscribe({
      next: ({ categories, dishes, page }) => {
        const content = page?.blocks.find(block => block.type === 'hero')?.content;
        if (content && typeof content === 'object') this.hero.set({ ...this.hero(), ...content });
        const sections = categories.map(category => {
          const categoryDishes = dishes.filter(dish => dish.category.id === category.id);
          return {
            slug: category.slug,
            category: category.name,
            eyebrow: category.eyebrow ?? '',
            title: category.name,
            intro: category.description ?? '',
            image: category.imageUrl || categoryDishes.find(dish => dish.imageUrl)?.imageUrl || '',
            dishes: categoryDishes.map(dish => ({
              slug: dish.slug,
              name: dish.name,
              description: dish.description,
              price: new Intl.NumberFormat('fr-FR', { style:'currency', currency:'EUR', minimumFractionDigits:0 }).format(Number(dish.price)),
              image: dish.imageUrl ?? '',
            })),
          };
        });
        this.sections.set(sections);
        this.active.set(sections[0]?.category ?? '');
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.error.set('La carte est momentanément indisponible.'); },
    });
  }

  protected selectCategory(category: string): void { this.active.set(category); }
  protected favoriteDish(dish: MenuDish, section: MenuSection): FavoriteDish {
    return { ...dish, categorySlug: section.slug };
  }
  protected toggleFavorite(dish: MenuDish, section: MenuSection): void { this.favorites.toggle(this.favoriteDish(dish, section)); }
}
