import { Component, DestroyRef, ElementRef, effect, inject, output, viewChild } from '@angular/core';
import { PublicSiteService } from '../public-site.service';

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
};

@Component({
  selector: 'app-turnstile',
  template: '<div #host class="turnstile-host" role="group" aria-label="Vérification anti-robot"></div>',
  styles: ':host{display:block;min-height:2px}.turnstile-host{margin:.85rem 0}',
})
export class Turnstile {
  private readonly site = inject(PublicSiteService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private rendered = false;
  readonly tokenChange = output<string>();

  constructor() {
    effect(() => {
      const siteKey = this.site.turnstileSiteKey();
      if (!siteKey || this.rendered || typeof document === 'undefined') return;
      this.rendered = true;
      void this.render(siteKey);
    });
  }

  private async render(siteKey: string): Promise<void> {
      const api = await this.loadScript();
      const widgetId = api.render(this.host().nativeElement, {
        sitekey: siteKey,
        theme: 'dark',
        size: 'flexible',
        callback: (token: string) => this.tokenChange.emit(token),
        'expired-callback': () => this.tokenChange.emit(''),
        'error-callback': () => this.tokenChange.emit(''),
      });
      this.destroyRef.onDestroy(() => api.remove(widgetId));
  }

  private loadScript(): Promise<TurnstileApi> {
    const current = (globalThis as typeof globalThis & { turnstile?: TurnstileApi }).turnstile;
    if (current) return Promise.resolve(current);
    return new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('#cloudflare-turnstile');
      const script = existing ?? document.createElement('script');
      script.id = 'cloudflare-turnstile';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.addEventListener('load', () => resolve((globalThis as typeof globalThis & { turnstile: TurnstileApi }).turnstile), { once: true });
      script.addEventListener('error', () => reject(new Error('Turnstile indisponible')), { once: true });
      if (!existing) document.head.append(script);
    });
  }
}
