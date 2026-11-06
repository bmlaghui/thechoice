import { afterNextRender, Component, computed, effect, ElementRef, input, viewChild } from '@angular/core';
import type { Map, Marker } from 'leaflet';

@Component({
  selector: 'app-restaurant-map',
  templateUrl: './restaurant-map.html',
  styleUrl: './restaurant-map.scss',
})
export class RestaurantMap {
  private readonly canvas = viewChild.required<ElementRef<HTMLElement>>('mapCanvas');
  private map?: Map;
  private marker?: Marker;
  readonly address = input.required<string>();
  readonly latitude = input<number | null>(null);
  readonly longitude = input<number | null>(null);
  readonly compact = input(false);
  protected readonly directionsUrl = computed(() => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(this.address())}`);

  constructor() {
    afterNextRender(async () => {
      const L = await import('leaflet');
      const position = this.position();
      this.map = L.map(this.canvas().nativeElement, { zoomControl: false, scrollWheelZoom: false }).setView(position, 17);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        className: 'choice-map-base',
        maxZoom: 20,
      }).addTo(this.map);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png', {
        className: 'choice-map-labels',
        maxZoom: 20,
        pane: 'overlayPane',
      }).addTo(this.map);
      L.control.zoom({ position: 'bottomright' }).addTo(this.map);
      const icon = L.divIcon({ className: 'choice-marker-wrap', html: '<span class="choice-marker-pulse"></span><span class="choice-marker"><i></i></span>', iconSize: [64, 64], iconAnchor: [32, 54] });
      this.marker = L.marker(position, { icon, title: 'The Choice' }).addTo(this.map).bindPopup(`<strong>The Choice</strong><br>${this.escapeHtml(this.address())}`);
      globalThis.setTimeout(() => this.map?.invalidateSize(), 0);
    });
    effect(() => {
      const position = this.position();
      this.map?.setView(position, this.map.getZoom(), { animate: true });
      this.marker?.setLatLng(position);
    });
  }

  private position(): [number, number] { return [this.latitude() ?? 49.0023, this.longitude() ?? 2.18]; }
  private escapeHtml(value: string): string { return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] || char); }
}
