import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-reservation-swipe',
  template: `
    <a
      class="swipe-call"
      [href]="phoneLink()"
      [attr.aria-label]="'Appeler ' + name()"
      [attr.aria-hidden]="!revealed()"
      [attr.tabindex]="revealed() ? 0 : -1"
      ><span aria-hidden="true">↗</span>Appeler</a
    >
    <div
      class="swipe-surface"
      [class.dragging]="dragging()"
      [style.transform]="'translateX(' + offset() + 'px)'"
    >
      <ng-content />
      <button
        class="swipe-toggle"
        type="button"
        (click)="toggle()"
        [attr.aria-expanded]="revealed()"
        [attr.aria-label]="
          revealed()
            ? 'Masquer le raccourci d’appel'
            : 'Afficher le raccourci d’appel pour ' + name()
        "
      >
        {{ revealed() ? 'Fermer →' : 'Appeler ↔' }}
      </button>
    </div>
  `,
  styles: `
    :host {
      display: block;
      position: relative;
      overflow: hidden;
      border-radius: 9px;
      background: #245e3a;
      touch-action: pan-y;
      margin-bottom: 10px;
    }
    .swipe-call {
      position: absolute;
      inset: 0 0 0 auto;
      width: 88px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 7px;
      color: #fff;
      font:
        600 11px 'Inter',
        Arial,
        sans-serif;
      text-decoration: none;
    }
    .swipe-call > span {
      font-size: 24px;
    }
    .swipe-surface {
      position: relative;
      z-index: 1;
      background: #fff;
      transition: transform 0.2s ease;
      will-change: transform;
      border-radius: 8px;
    }
    .swipe-surface.dragging {
      transition: none;
    }
    .swipe-toggle {
      display: none;
      width: 100%;
      min-height: 39px;
      padding: 9px 12px;
      border: 0;
      border-top: 1px solid #e4eadf;
      background: #f1f6ec;
      color: #345b3d;
      font:
        600 11px 'Inter',
        Arial,
        sans-serif;
      text-align: right;
      cursor: pointer;
    }
    :host:focus-within {
      outline: 2px solid #4a7d4a;
      outline-offset: 2px;
    }
    .swipe-toggle:focus-visible,
    .swipe-call:focus-visible {
      outline: 3px solid #73a77a;
      outline-offset: -4px;
    }
    @media (max-width: 1100px), (pointer: coarse) {
      .swipe-toggle {
        display: block;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .swipe-surface {
        transition: none;
      }
    }
  `,
  host: {
    '(pointerdown)': 'pointerDown($event)',
    '(pointermove)': 'pointerMove($event)',
    '(pointerup)': 'pointerUp($event)',
    '(pointercancel)': 'pointerCancel()',
  },
})
export class ReservationSwipe {
  readonly phone = input.required<string>();
  readonly name = input.required<string>();
  readonly revealed = signal(false);
  readonly dragging = signal(false);
  readonly offset = signal(0);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private pointer: number | null = null;
  private startX = 0;
  private startY = 0;
  private startOffset = 0;
  private suppressUntil = 0;
  constructor() {
    afterNextRender(() => {
      const preventGhostClick = (event: MouseEvent) => {
        if (performance.now() < this.suppressUntil) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      };
      this.element.nativeElement.addEventListener('click', preventGhostClick, { capture: true });
      this.destroyRef.onDestroy(() =>
        this.element.nativeElement.removeEventListener('click', preventGhostClick, {
          capture: true,
        }),
      );
    });
  }
  protected phoneLink(): string {
    return 'tel:' + this.phone().replace(/[^+\d]/g, '');
  }
  protected toggle(): void {
    this.revealed.update((value) => !value);
    this.offset.set(this.revealed() ? -88 : 0);
  }
  protected pointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' || !event.isPrimary) return;
    this.suppressUntil = 0;
    this.pointer = event.pointerId;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.startOffset = this.offset();
  }
  protected pointerMove(event: PointerEvent): void {
    if (this.pointer !== event.pointerId) return;
    const dx = event.clientX - this.startX,
      dy = event.clientY - this.startY;
    if (!this.dragging()) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
        this.pointer = null;
        return;
      }
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
      this.dragging.set(true);
      this.element.nativeElement.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    this.offset.set(Math.max(-88, Math.min(0, this.startOffset + dx)));
  }
  protected pointerUp(event: PointerEvent): void {
    if (this.pointer !== event.pointerId) return;
    if (this.dragging()) {
      this.revealed.set(this.offset() < -40);
      this.offset.set(this.revealed() ? -88 : 0);
      this.suppressUntil = performance.now() + 350;
      if (this.element.nativeElement.hasPointerCapture(event.pointerId))
        this.element.nativeElement.releasePointerCapture(event.pointerId);
    }
    this.pointer = null;
    this.dragging.set(false);
  }
  protected pointerCancel(): void {
    this.pointer = null;
    this.dragging.set(false);
    this.offset.set(this.revealed() ? -88 : 0);
  }
}
