import { HttpClient } from '@angular/common/http';
import { afterNextRender, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { PublicSiteService } from '../public-site.service';

type CmsPage = { title: string; blocks: Array<{ type: string; content: unknown }>; seo?: { title: string; description: string } };

@Component({
  selector:    'app-legal-page',
  imports:     [RouterLink],
  templateUrl: './legal-page.html',
  styleUrl:    './legal-page.scss',
})
export class LegalPage {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly titleService = inject(Title);
  private readonly meta = inject(Meta);
  protected readonly site = inject(PublicSiteService);
  protected readonly privacy = this.route.snapshot.routeConfig?.path === 'privacy';
  protected readonly title = signal(this.privacy ? 'Politique de confidentialité' : 'Mentions légales');
  protected readonly body = signal(this.privacy
    ? 'Les données transmises sont utilisées uniquement pour traiter vos demandes. Vous pouvez exercer vos droits en contactant le restaurant.'
    : 'Les informations légales complètes de The Choice Restaurant seront publiées ici.');

  constructor() {
    afterNextRender(() => {
      const slug = this.privacy ? 'privacy' : 'legal';
      const base = ['4200', '4201'].includes(globalThis.location?.port ?? '') ? 'http://localhost:3000/api/v1' : '/api/v1';
      this.http.get<CmsPage>(`${base}/pages/${slug}`).subscribe({ next: page => {
        if (!page) return;
        this.title.set(page.title);
        const richText = page.blocks.find(block => block.type === 'rich-text')?.content;
        if (richText && typeof richText === 'object' && 'body' in richText) this.body.set(String((richText as {body:unknown}).body));
        if (page.seo?.title) this.titleService.setTitle(page.seo.title);
        if (page.seo?.description) this.meta.updateTag({ name: 'description', content: page.seo.description });
      }, error: () => undefined });
    });
  }
}
