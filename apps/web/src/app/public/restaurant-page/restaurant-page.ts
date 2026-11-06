import { afterNextRender, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { PublicSiteService } from '../public-site.service';

@Component({
  selector: 'app-restaurant-page',
  imports: [NgOptimizedImage, RouterLink],
  templateUrl: './restaurant-page.html',
  styleUrl: './restaurant-page.scss',
})
export class RestaurantPage {
  private readonly http=inject(HttpClient);
  protected readonly site=inject(PublicSiteService);
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('restaurantVideo');
  protected readonly videoPlaying = signal(false);
  protected readonly gallery=signal([
    {imageUrl:'/images/interior.png',alt:'Salle principale'},
    {imageUrl:'/images/restaurant/unnamed.webp',alt:'Ambiance du restaurant'},
    {imageUrl:'/images/restaurant/unnamed (2).webp',alt:'Bar et espace lounge'},
  ]);
  protected readonly intro=signal({title:'Un lieu élégant et chaleureux.',text:'Pensé pour vous accueillir dans un cadre moderne et raffiné, The Choice vous ouvre ses portes pour une expérience à son image.',imageUrl:''});

  constructor(){afterNextRender(()=>{const base=['4200', '4201'].includes(globalThis.location?.port ?? '')?'http://localhost:3000/api/v1':'/api/v1';this.http.get<Array<{imageUrl:string;alt:string}>>(`${base}/gallery`).subscribe({next:items=>{if(items.length)this.gallery.set(items.slice(0,3));},error:()=>undefined});this.http.get<{blocks:Array<{type:string;content:unknown}>}>(`${base}/pages/restaurant`).subscribe({next:page=>{const content=page?.blocks.find(block=>block.type==='intro')?.content;if(content&&typeof content==='object')this.intro.update(current=>({...current,...content}));},error:()=>undefined});});}

  protected playVideo(): void {
    void this.video()?.nativeElement.play();
  }
}
