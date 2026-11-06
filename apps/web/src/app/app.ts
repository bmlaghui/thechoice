import { Component, inject, signal } from '@angular/core';
import { DOCUMENT, NgOptimizedImage } from '@angular/common';
import { Meta } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { PublicSiteService } from './public/public-site.service';

@Component({
  selector: 'app-root',
  host: {'(window:scroll)': 'onScroll()'},
  imports: [NgOptimizedImage, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  protected readonly site = inject(PublicSiteService);
  protected readonly menuOpen = signal(false);
  protected readonly scrolled = signal(false);
  protected readonly hidePublicChrome = signal(this.router.url.startsWith('/admin'));
  constructor() {
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => {
      this.hidePublicChrome.set(event.urlAfterRedirects.startsWith('/admin'));
      if (this.hidePublicChrome()) this.menuOpen.set(false);
      this.updateSeoUrl(event.urlAfterRedirects);
    });
  }
  private updateSeoUrl(url: string): void {
    const path = url.split('?')[0].split('#')[0];
    const privatePage = path.startsWith('/admin') || path.startsWith('/reservation/gestion/');
    this.meta.updateTag({ name: 'robots', content: privatePage ? 'noindex, nofollow' : 'index, follow' });
    const canonical = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = `https://thechoice.mlaghuibrahim.fr${privatePage ? '/' : path || '/'}`;
    this.meta.updateTag({ property: 'og:url', content: `https://thechoice.mlaghuibrahim.fr${path || '/'}` });
  }
  protected toggleMenu(): void { this.menuOpen.update((open) => !open); }
  protected closeMenu(): void { this.menuOpen.set(false); }
  protected onScroll(): void { this.scrolled.set(globalThis.scrollY > 48); }
}
