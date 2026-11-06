import { afterNextRender, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface EventOffer {
  title: string;
  desc:  string;
  icon:  string;
}

@Component({
  selector:    'app-events-page',
  imports:     [RouterLink],
  templateUrl: './events-page.html',
  styleUrl:    './events-page.scss',
})
export class EventsPage {
  private readonly http=inject(HttpClient);
  protected readonly hero=signal({eyebrow:'Événements & privatisation',title:'Vos événements sur mesure.',text:"Anniversaires, repas d'affaires, soirées privées, groupes… Notre équipe crée des moments uniques à votre image, dans un cadre inoubliable.",imageUrl:''});

  protected readonly offers = signal<EventOffer[]>([
    {
      title: 'Anniversaires',
      desc:  'Une célébration pensée dans les moindres détails.',
      icon:  'M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-6v2m-4 4h2m8 0h-2m-4 4v2',
    },
    {
      title: 'Repas d\'affaires',
      desc:  'Un cadre élégant pour réunir vos équipes et clients.',
      icon:  'M17 20H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1m8 2h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2ZM9 4h6v4H9V4Zm0 8h6m-6 4h4',
    },
    {
      title: 'Soirées privées',
      desc:  'Un espace privatisé et une ambiance sur mesure.',
      icon:  'M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7l3-7Z',
    },
    {
      title: 'Groupes',
      desc:  'Des formules adaptées pour les grands groupes.',
      icon:  'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm14 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    },
  ]);
  constructor(){afterNextRender(()=>{const base=['4200', '4201'].includes(globalThis.location?.port ?? '')?'http://localhost:3000/api/v1':'/api/v1';this.http.get<Array<{title:string;description:string}>>(`${base}/events`).subscribe({next:items=>{if(items.length)this.offers.set(items.map(item=>({title:item.title,desc:item.description,icon:'M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7l3-7Z'})));},error:()=>undefined});this.http.get<{blocks:Array<{type:string;content:unknown}>}>(`${base}/pages/events`).subscribe({next:page=>{const content=page?.blocks.find(block=>block.type==='hero')?.content;if(content&&typeof content==='object')this.hero.update(current=>({...current,...content}));},error:()=>undefined});});}
}
