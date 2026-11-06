import { HttpClient } from '@angular/common/http';
import { afterNextRender, computed, inject, Injectable, signal } from '@angular/core';

export type OpeningHour = { day: number; label: string; opensAt: string | null; closesAt: string | null; closed: boolean };
export type SocialLink = { platform: string; url: string; active?: boolean };
export type ContactSettings = { phone: string; email: string; address: string; latitude: number | null; longitude: number | null };
export type ReservationSettings = { enabled: boolean; minGuests: number; maxGuests: number; slotMinutes: number; maxCoversPerSlot: number; advanceDays: number; confirmationMode: string };

type PublicSettingsResponse = {
  settings: Record<string, unknown>;
  openingHours: OpeningHour[];
  socialLinks: SocialLink[];
  turnstileSiteKey: string | null;
};

@Injectable({ providedIn: 'root' })
export class PublicSiteService {
  private readonly http = inject(HttpClient);
  private readonly response = signal<PublicSettingsResponse | null>(null);
  readonly contact = computed<ContactSettings>(() => {
    const value = this.response()?.settings['contact'];
    if (value && typeof value === 'object') {
      const contact = value as Partial<ContactSettings>;
      return {
        phone: contact.phone || '01 60 17 56 68',
        email: contact.email || 'contact@thechoicerestaurant.fr',
        address: contact.address || '264 boulevard du Havre, 95480 Pierrelaye',
        latitude: typeof contact.latitude === 'number' ? contact.latitude : null,
        longitude: typeof contact.longitude === 'number' ? contact.longitude : null,
      };
    }
    return { phone: '01 60 17 56 68', email: 'contact@thechoicerestaurant.fr', address: '264 boulevard du Havre, 95480 Pierrelaye', latitude: 49.0023, longitude: 2.18 };
  });
  readonly socialLinks = computed(() => this.response()?.socialLinks ?? []);
  readonly identity = computed(() => {
    const value = this.response()?.settings['identity'];
    const data = value && typeof value === 'object' ? value as Record<string, string> : {};
    return { name: data['name'] || 'The Choice', baseline: data['baseline'] || 'More than food, a feeling', logo: data['logo'] || '/images/logo/logo-official.png' };
  });
  readonly turnstileSiteKey = computed(() => this.response()?.turnstileSiteKey ?? '');
  readonly reservationSettings = computed<ReservationSettings>(() => {
    const value = this.response()?.settings['reservation'];
    const data = value && typeof value === 'object' ? value as Partial<ReservationSettings> : {};
    return { enabled: data.enabled !== false, minGuests: Number(data.minGuests) || 1, maxGuests: Number(data.maxGuests) || 30, slotMinutes: Number(data.slotMinutes) || 30, maxCoversPerSlot: Number(data.maxCoversPerSlot) || 40, advanceDays: Number(data.advanceDays) || 60, confirmationMode: data.confirmationMode || 'manual' };
  });
  readonly hourGroups = computed(() => this.groupHours(this.response()?.openingHours ?? []));
  readonly restaurantStats = computed(() => {
    const value = this.response()?.settings['restaurantStats'];
    const stats = value && typeof value === 'object' ? value as Record<string, string | number> : {};
    return {
      seats: stats['seats'] || 180,
      parking: stats['parking'] || 400,
      certification: stats['certification'] || '100%',
      certificationLabel: stats['certificationLabel'] || 'Halal',
    };
  });

  constructor() { afterNextRender(() => this.load()); }

  socialUrl(platform: string): string {
    return this.socialLinks().find((link) => link.platform.toLowerCase() === platform.toLowerCase())?.url || '#';
  }

  private load(): void {
    const base = ['4200', '4201'].includes(globalThis.location?.port ?? '') ? 'http://localhost:3000/api/v1' : '/api/v1';
    this.http.get<PublicSettingsResponse>(`${base}/site/settings`).subscribe({ next: (response) => this.response.set(response), error: () => undefined });
  }

  private groupHours(items: OpeningHour[]) {
    const ordered = [...items].sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7));
    const groups: Array<{ labels: string[]; hours: string }> = [];
    for (const item of ordered) {
      const hours = item.closed || !item.opensAt || !item.closesAt ? 'Fermé' : `${item.opensAt} – ${item.closesAt}`;
      const last = groups.at(-1);
      if (last?.hours === hours) last.labels.push(item.label);
      else groups.push({ labels: [item.label], hours });
    }
    return groups.map(({ labels, hours }) => ({ label: labels.length === 1 ? labels[0] : `${labels[0]} – ${labels.at(-1)}`, hours }));
  }
}
