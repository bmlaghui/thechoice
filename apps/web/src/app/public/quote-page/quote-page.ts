import { afterNextRender, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { PublicSiteService } from '../public-site.service';
import { Turnstile } from '../turnstile/turnstile';

@Component({selector:'app-quote-page',imports:[ReactiveFormsModule,RouterLink,Turnstile],templateUrl:'./quote-page.html',styleUrl:'./quote-page.scss'})
export class QuotePage {
  private readonly fb=inject(FormBuilder);
  private readonly http=inject(HttpClient);
  protected readonly site=inject(PublicSiteService);
  private readonly openedAt=Date.now();
  protected readonly sent=signal(false);
  protected readonly sending=signal(false);
  protected readonly error=signal('');
  protected readonly turnstileToken=signal('');
  protected readonly pageContent=signal({eyebrow:'Événements & privatisation',title:'Imaginons votre événement.',text:'Parlez-nous de votre projet. Notre équipe construit une expérience sur mesure, du menu à la mise en scène.',imageUrl:''});
  protected readonly minDate=this.localDate(new Date());
  protected readonly form=this.fb.nonNullable.group({eventType:['Anniversaire',Validators.required],date:['',Validators.required],guests:[20,[Validators.required,Validators.min(8)]],budget:[''],name:['',[Validators.required,Validators.maxLength(100)]],email:['',[Validators.required,Validators.email]],phone:['',Validators.required],message:['',Validators.maxLength(2000)],website:['']});
  constructor(){afterNextRender(()=>{const base=['4200', '4201'].includes(globalThis.location?.port ?? '')?'http://localhost:3000/api/v1':'/api/v1';this.http.get<{blocks:Array<{type:string;content:unknown}>}>(`${base}/pages/quote`).subscribe({next:page=>{const content=page?.blocks.find(block=>block.type==='hero')?.content;if(content&&typeof content==='object')this.pageContent.update(current=>({...current,...content}));},error:()=>undefined});});}
  protected submit():void{
    this.form.markAllAsTouched();if(this.form.invalid||this.sending())return;
    this.sending.set(true);this.error.set('');
    const {date,budget,website,...value}=this.form.getRawValue();
    const message=[value.message,budget?`Budget indicatif : ${budget}`:''].filter(Boolean).join('\n\n');
    const base=['4200', '4201'].includes(globalThis.location?.port ?? '')?'http://localhost:3000/api/v1':'/api/v1';
    this.http.post(`${base}/event-inquiries`,{...value,eventDate:date,message,website,submittedAt:this.openedAt,turnstileToken:this.turnstileToken()}).subscribe({next:()=>{this.sending.set(false);this.sent.set(true);},error:response=>{this.sending.set(false);this.error.set(response.status===429?'Trop de tentatives. Réessayez dans une minute.':response.error?.message||'La demande n’a pas pu être envoyée. Réessayez.');}});
  }
  private localDate(date:Date):string{return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
}
