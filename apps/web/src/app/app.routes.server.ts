import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'admin/**',
    renderMode: RenderMode.Client
  },
  {
    path: 'reservation/gestion/:token',
    renderMode: RenderMode.Client
  },
  {
    path: 'menu/:categorySlug/:dishSlug',
    renderMode: RenderMode.Server
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
