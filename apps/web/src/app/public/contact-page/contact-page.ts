import { afterNextRender, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { PublicSiteService } from '../public-site.service';
import { RestaurantMap } from '../restaurant-map/restaurant-map';
import { Turnstile } from '../turnstile/turnstile';
@Component({selector:'app-contact-page',imports:[ReactiveFormsModule,RestaurantMap,Turnstile],templateUrl:'./contact-page.html',styleUrl:'./contact-page.scss'})
export class ContactPage {
  private readonly fb=inject(FormBuilder);
  private readonly http=inject(HttpClient);
  protected readonly site=inject(PublicSiteService);
  private readonly openedAt=Date.now();
  protected readonly sent=signal(false);
  protected readonly sending=signal(false);
  protected readonly error=signal('');
  protected readonly turnstileToken=signal('');
  protected readonly pageContent=signal({eyebrow:'Nous sommes à votre écoute',title:'Une question ? Une réservation ?',text:'Notre équipe est disponible pour répondre à toutes vos demandes. Contactez-nous ou venez nous rendre visite.',imageUrl:''});
  protected readonly form=this.fb.nonNullable.group({name:['',Validators.required],email:['',[Validators.required,Validators.email]],phone:[''],message:['',Validators.required],website:['']});
  constructor(){afterNextRender(()=>{const base=['4200', '4201'].includes(globalThis.location?.port ?? '')?'http://localhost:3000/api/v1':'/api/v1';this.http.get<{blocks:Array<{type:string;content:unknown}>}>(`${base}/pages/contact`).subscribe({next:page=>{const content=page?.blocks.find(block=>block.type==='hero')?.content;if(content&&typeof content==='object')this.pageContent.update(current=>({...current,...content}));},error:()=>undefined});});}
  protected submit():void{
    this.form.markAllAsTouched();
    if(this.form.invalid||this.sending())return;
    this.sending.set(true);this.error.set('');
    const base=['4200', '4201'].includes(globalThis.location?.port ?? '')?'http://localhost:3000/api/v1':'/api/v1';
    this.http.post(`${base}/contact`,{...this.form.getRawValue(),submittedAt:this.openedAt,turnstileToken:this.turnstileToken()}).subscribe({next:()=>{this.sending.set(false);this.sent.set(true);},error:error=>{this.sending.set(false);this.error.set(error.status===429?'Trop de tentatives. Réessayez dans une minute.':error.error?.message||'Le message n’a pas pu être envoyé. Réessayez plus tard.');}});
  }
}
