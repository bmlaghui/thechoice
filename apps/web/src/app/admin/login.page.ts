import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminApiService } from './admin-api.service';

@Component({
  selector: 'app-admin-login',
  imports: [ReactiveFormsModule, NgOptimizedImage],
  template: `
    <main class="login-shell">
      <div class="glow"></div>
      <section class="visual" aria-hidden="true"><img ngSrc="/images/logo/logo-official.png" width="430" height="182" priority alt=""><p>More than food,<br><em>a feeling.</em></p></section>
      <section class="login-card">
        <img class="mobile-logo" ngSrc="/images/logo/logo-official.png" width="180" height="76" priority alt="The Choice Fusion Food">
        <p class="eyebrow">Espace privé</p><h1>Bienvenue<br><em>à la maison.</em></h1>
        <p class="intro">Pilotez votre restaurant, vos contenus et vos réservations depuis un seul espace.</p>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <label for="email">Adresse e-mail</label><input id="email" type="email" formControlName="email" autocomplete="username">
          <label for="password">Mot de passe</label><div class="password-field"><input id="password" [type]="showPassword() ? 'text' : 'password'" formControlName="password" autocomplete="current-password"><button type="button" (click)="showPassword.update(value => !value)" [attr.aria-label]="showPassword() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'" [attr.aria-pressed]="showPassword()"><span aria-hidden="true">{{ showPassword() ? '◉' : '◌' }}</span>{{ showPassword() ? 'Masquer' : 'Afficher' }}</button></div>
          @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
          <button type="submit" [disabled]="form.invalid || loading()">{{ loading() ? 'Connexion…' : 'Entrer dans le studio' }} <span>→</span></button>
        </form>
        <a href="/">← Retour au restaurant</a>
      </section>
    </main>`,
  styles: [`
    :host{display:block;min-height:100svh;background:#030504;color:#fff;font-family:'Inter',Arial,sans-serif}.login-shell{min-height:100svh;display:grid;grid-template-columns:1.1fr .9fr;position:relative;overflow:hidden}.glow{position:absolute;width:60vw;height:60vw;border-radius:50%;background:#397d4830;filter:blur(120px);left:-25vw;bottom:-35vw}.visual{position:relative;display:flex;flex-direction:column;justify-content:center;padding:8vw;background:linear-gradient(90deg,#020403dd,#02040380),url('/images/hero/sharing-table-01.jpg') center/cover}.visual>img{width:min(430px,78%);height:auto;filter:drop-shadow(0 15px 35px #000)}.visual p{font:600 clamp(32px,3.4vw,54px)/.95 'Barlow Condensed',Impact,sans-serif;text-transform:uppercase;letter-spacing:-.02em;margin:70px 0 0}.visual em{color:#78bd7f;font-style:normal}.login-card{align-self:center;width:min(440px,84%);margin:auto;padding:50px 0}.mobile-logo{display:none;width:180px;height:auto;margin-bottom:45px}.eyebrow{color:#6db477;letter-spacing:.2em;text-transform:uppercase;font-size:10px;font-weight:500}.login-card h1{font:700 clamp(51px,5.5vw,75px)/.82 'Barlow Condensed',Impact,sans-serif;text-transform:uppercase;letter-spacing:-.035em;margin:18px 0 24px}.login-card h1 em{color:#66ad70;font-style:normal}.intro{color:#aeb7b0;font:400 13px/1.7 'Inter',Arial,sans-serif;max-width:370px;margin-bottom:32px}form{display:grid;gap:9px}label{font:500 10px 'Inter',Arial,sans-serif;text-transform:uppercase;letter-spacing:.1em;color:#d0d7d1;margin-top:10px}input{width:100%;height:52px;border:1px solid #ffffff20;border-radius:4px;background:#0d120f;color:#fff;padding:0 15px;font:400 14px 'Inter',Arial,sans-serif}.password-field{position:relative}.password-field input{padding-right:104px}.password-field button{position:absolute;right:7px;top:50%;transform:translateY(-50%);width:auto;height:38px;margin:0;padding:0 10px;border:0;background:transparent;color:#79ad80;font:500 9px 'Inter',Arial,sans-serif;letter-spacing:.04em;text-transform:uppercase}.password-field button:hover{background:#ffffff08}.password-field button span{float:none;margin:0 6px 0 0;font-size:12px}form>button{margin-top:16px;height:52px;border:1px solid #78b87c55;border-radius:4px;background:linear-gradient(135deg,#397e45,#245d30);color:#fff;text-transform:uppercase;letter-spacing:.1em;font:600 10px 'Inter',Arial,sans-serif;cursor:pointer}form>button:disabled{cursor:not-allowed;opacity:.55}form>button span{float:right;margin-right:16px}.error{color:#ff9b91;font:400 12px 'Inter',Arial,sans-serif}.login-card>a{display:inline-block;margin-top:28px;color:#a5aea7;font:400 11px 'Inter',Arial,sans-serif}@media(max-width:800px){.login-shell{grid-template-columns:1fr}.visual{display:none}.login-card{padding:55px 0}.mobile-logo{display:block}}
  `],
})
export class AdminLoginPage {
  private readonly api = inject(AdminApiService); private readonly router = inject(Router);
  protected readonly loading = signal(false); protected readonly error = signal('');
  protected readonly showPassword = signal(false);
  protected readonly form = new FormGroup({ email: new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.email]}), password: new FormControl('',{nonNullable:true,validators:[Validators.required]}) });
  protected submit(){if(this.form.invalid)return;this.loading.set(true);this.error.set('');this.api.login(this.form.controls.email.value,this.form.controls.password.value).subscribe({next:result=>void this.router.navigateByUrl(result.user.role === 'EDITOR' ? '/admin/reservations' : '/admin'),error:(error:HttpErrorResponse)=>{if(error.status===429)this.error.set('Trop de tentatives de connexion. Patientez une minute avant de réessayer.');else if(error.status===401)this.error.set('Identifiants incorrects. Vérifiez votre e-mail et votre mot de passe.');else if(error.status===0)this.error.set('Le serveur est indisponible. Vérifiez que l’API est démarrée.');else this.error.set('La connexion a échoué. Réessayez dans quelques instants.');this.loading.set(false);}});}
}
