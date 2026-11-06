import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// ─── Page 404 ────────────────────────────────────────────────────────────────
// Wireframe 10 : grand "404" blanc, fond sombre, image culinaire, CTA accueil
@Component({
  selector:  'app-not-found',
  imports:   [RouterLink],
  template: `
    <section class="not-found" aria-labelledby="not-found-title">
      <div class="nf-visual" aria-hidden="true"></div>
      <div class="nf-copy">
        <p class="nf-big" aria-hidden="true">404</p>
        <h1 id="not-found-title" class="nf-title">Page non trouvée</h1>
        <p class="nf-desc">La page que vous recherchez n'existe pas ou a été déplacée.</p>
        <div class="nf-actions">
          <a class="button" routerLink="/"     id="btn-retour-accueil-404">Retour à l'accueil</a>
          <a class="button secondary" routerLink="/menu" id="btn-voir-menu-404">Voir le menu</a>
        </div>
      </div>
    </section>
  `,
  styleUrl: './not-found.page.scss',
})
export class NotFoundPage {}
