import { Routes } from '@angular/router';
import { adminGuard } from './admin/admin.guard';

export const routes: Routes = [
  // ─── Pages publiques ──────────────────────────────────────────────────────
  {
    path: '',
    loadComponent: () => import('./public/home.page').then(m => m.HomePage),
    title: 'The Choice — Fusion Food à Pierrelaye',
  },
  {
    path: 'restaurant',
    loadComponent: () => import('./public/restaurant-page/restaurant-page').then(m => m.RestaurantPage),
    title: 'Le Restaurant — The Choice',
  },
  {
    path: 'menu',
    loadComponent: () => import('./public/menu-page/menu-page').then(m => m.MenuPage),
    title: 'Notre Menu — The Choice',
  },
  {
    path: 'reservation',
    loadComponent: () => import('./public/reservation-page/reservation-page').then(m => m.ReservationPage),
    title: 'Réservation — The Choice',
  },
  {
    path: 'reservation/gestion/:token',
    loadComponent: () => import('./public/manage-reservation/manage-reservation').then(m => m.ManageReservation),
    title: 'Gérer ma réservation — The Choice',
  },
  {
    path: 'events',
    loadComponent: () => import('./public/events-page/events-page').then(m => m.EventsPage),
    title: 'Événements & Privatisation — The Choice',
  },
  {
    path: 'quote',
    loadComponent: () => import('./public/quote-page/quote-page').then(m => m.QuotePage),
    title: 'Demande de devis — The Choice',
  },
  {
    path: 'gallery',
    loadComponent: () => import('./public/gallery-page/gallery-page').then(m => m.GalleryPage),
    title: 'Galerie — The Choice',
  },
  {
    path: 'contact',
    loadComponent: () => import('./public/contact-page/contact-page').then(m => m.ContactPage),
    title: 'Contact — The Choice',
  },
  {
    path: 'menu/:categorySlug/:dishSlug',
    loadComponent: () => import('./public/dish-detail-page/dish-detail-page').then(m => m.DishDetailPage),
    title: 'Détail du plat — The Choice',
  },
  // ─── Pages légales ────────────────────────────────────────────────────────
  {
    path: 'legal',
    loadComponent: () => import('./public/legal-page/legal-page').then(m => m.LegalPage),
    title: 'Mentions légales — The Choice',
  },
  {
    path: 'privacy',
    loadComponent: () => import('./public/legal-page/legal-page').then(m => m.LegalPage),
    title: 'Politique de confidentialité — The Choice',
  },
  // ─── Admin (lazy, guard-protected) ───────────────────────────────────────
  {
    path: 'admin/login',
    loadComponent: () => import('./admin/login.page').then(m => m.AdminLoginPage),
    title: 'Connexion administration — The Choice',
  },
  {path:'admin/invitation',loadComponent:()=>import('./admin/invitation.page').then(m=>m.InvitationPage),title:'Activer mon accès — The Choice'},
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin.page').then(m => m.AdminPage),
    canActivate: [adminGuard],
    title: 'Administration — The Choice',
  },
  {
    path: 'admin/profile',
    loadComponent: () => import('./admin/profile.page').then(m => m.AdminProfilePage),
    canActivate: [adminGuard],
    title: 'Mon profil — The Choice',
  },
  // ─── 404 ──────────────────────────────────────────────────────────────────
  {
    path: '**',
    loadComponent: () => import('./public/not-found.page').then(m => m.NotFoundPage),
    title: '404 — Page non trouvée · The Choice',
  },
];
