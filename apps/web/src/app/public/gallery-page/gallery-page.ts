import {
  afterNextRender,
  Component,
  ElementRef,
  signal,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';

type GalleryCategory = string;

interface GalleryItem {
  src: string;
  alt: string;
  category: string;
  caption?: string;
}

@Component({
  selector: 'app-gallery-page',
  imports: [NgOptimizedImage, RouterLink],
  host: { '(document:keydown)': 'onKeydown($event)' },
  templateUrl: './gallery-page.html',
  styleUrl: './gallery-page.scss',
})
export class GalleryPage {
  private readonly http = inject(HttpClient);
  private readonly lightbox = viewChild<ElementRef<HTMLDialogElement>>('lightbox');
  protected readonly activeImage = signal(0);
  protected readonly currentImage = computed(() => this.visibleItems()[this.activeImage()] ?? null);
  protected readonly photoCount = computed(() => this.visibleItems().length);
  protected setFilter(category: string): void {
    this.activeFilter.set(category);
    this.activeImage.set(0);
  }
  protected openImage(index: number): void {
    this.activeImage.set(index);
    this.lightbox()?.nativeElement.showModal();
  }
  protected closeLightbox(): void {
    this.lightbox()?.nativeElement.close();
  }
  protected moveImage(direction: number): void {
    const total = this.visibleItems().length;
    if (total) this.activeImage.update((index) => (index + direction + total) % total);
  }
  protected onKeydown(event: KeyboardEvent): void {
    if (!this.lightbox()?.nativeElement.open) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      this.moveImage(event.key === 'ArrowRight' ? 1 : -1);
    }
  }
  protected readonly hero = signal({
    eyebrow: 'Galerie',
    title: 'Plongez dans notre univers.',
    text: 'Le restaurant, les assiettes et les moments qui font The Choice.',
    imageUrl: '',
  });

  protected readonly categories = signal<GalleryCategory[]>([
    'Tout',
    'Restaurant',
    'Plats',
    'Cocktails',
    'Événements',
  ]);

  protected readonly activeFilter = signal<GalleryCategory>('Tout');

  protected readonly allItems = signal<GalleryItem[]>([
    { src: '/images/interior.png', alt: 'Salle principale du restaurant', category: 'Restaurant' },
    { src: '/images/restaurant/unnamed.webp', alt: 'Plats à partager', category: 'Restaurant' },
    {
      src: '/images/restaurant/unnamed (2).webp',
      alt: 'Tables dressées avec soin',
      category: 'Restaurant',
    },
    {
      src: '/images/restaurant/unnamed (3).webp',
      alt: 'Cocktails et bouchées',
      category: 'Cocktails',
    },
    {
      src: '/images/restaurant/unnamed (4).webp',
      alt: 'Un moment à table',
      category: 'Restaurant',
    },
    {
      src: '/images/restaurant/unnamed (5).webp',
      alt: 'Desserts à partager',
      category: 'Restaurant',
    },
    {
      src: '/images/dishes/truffle-gol-gappa.jpg',
      alt: 'Truffle Gol Gappa',
      category: 'Plats',
      caption: 'Truffle Gol Gappa',
    },
    {
      src: '/images/dishes/black-truffle-burger.jpg',
      alt: 'Black Truffle Burger',
      category: 'Plats',
      caption: 'The Choice Burger',
    },
    {
      src: '/images/dishes/grill-selection.jpg',
      alt: 'Sélection grill du chef',
      category: 'Plats',
      caption: 'The Choice Grill',
    },
    {
      src: '/images/dishes/nems-crevette.jpg',
      alt: 'Nems et crevettes',
      category: 'Plats',
      caption: 'Nems aux crevettes',
    },
    { src: '/images/dishes/truffle-rice.jpg', alt: 'Riz à la truffe', category: 'Plats' },
    { src: '/images/menu-dishes.png', alt: 'Plats signature du chef', category: 'Plats' },
    {
      src: '/images/events/champagne.png',
      alt: 'Flûtes de champagne',
      category: 'Cocktails',
      caption: 'Champagne de prestige',
    },
    {
      src: '/images/events/noodles-lifestyle.jpg',
      alt: 'Dégustation de nouilles',
      category: 'Plats',
    },
    {
      src: '/images/events/server-dishes.jpg',
      alt: 'Service en salle',
      category: 'Événements',
      caption: 'Soirée privée',
    },
    {
      src: '/images/hero/sharing-table-01.jpg',
      alt: 'Table conviviale partagée',
      category: 'Événements',
      caption: "Repas d'affaires",
    },
    {
      src: '/images/hero/sharing-table-02.jpg',
      alt: 'Repas festif entre amis',
      category: 'Événements',
      caption: 'Anniversaire',
    },
  ]);

  constructor() {
    afterNextRender(() => {
      const base = ['4200', '4201'].includes(globalThis.location?.port ?? '')
        ? 'http://localhost:3000/api/v1'
        : '/api/v1';
      this.http
        .get<Array<{ title: string; category: string; imageUrl: string; alt: string }>>(
          `${base}/gallery`,
        )
        .subscribe({
          next: (items) => {
            if (items.length) {
              const unique = items.filter(
                (item, index) =>
                  items.findIndex((other) => other.imageUrl === item.imageUrl) === index,
              );
              const mapped = unique.map((item) => ({
                src: item.imageUrl,
                alt: item.alt,
                category: item.category,
                caption: item.title,
              }));
              this.allItems.set(mapped);
              this.categories.set(['Tout', ...new Set(mapped.map((item) => item.category))]);
              this.activeFilter.set('Tout');
            }
          },
          error: () => undefined,
        });
      this.http
        .get<{ blocks: Array<{ type: string; content: unknown }> }>(`${base}/pages/gallery`)
        .subscribe({
          next: (page) => {
            const content = page?.blocks.find((block) => block.type === 'hero')?.content;
            if (content && typeof content === 'object')
              this.hero.update((current) => ({ ...current, ...content }));
          },
          error: () => undefined,
        });
    });
  }

  protected readonly visibleItems = computed(() => {
    const filter = this.activeFilter();
    return filter === 'Tout'
      ? this.allItems()
      : this.allItems().filter((i) => i.category === filter);
  });
}
