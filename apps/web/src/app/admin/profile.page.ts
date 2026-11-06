import { Component, inject, OnInit, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminApiService } from './admin-api.service';

type Profile = { id: string; name?: string; email: string; role: string; lastLoginAt?: string; passwordChangedAt?: string };

@Component({
  selector: 'app-admin-profile',
  imports: [NgOptimizedImage, ReactiveFormsModule, RouterLink],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss',
})
export class AdminProfilePage implements OnInit {
  protected readonly api = inject(AdminApiService);
  private readonly router = inject(Router);
  protected readonly profile = signal<Profile | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly success = signal('');
  protected readonly showPasswords = signal(false);
  protected readonly identity = new FormGroup({
    name: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });
  protected readonly password = new FormGroup({
    currentPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    newPassword: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(15), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)] }),
    confirmation: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  ngOnInit() {
    this.api.get<Profile>('/admin/profile').subscribe({
      next: profile => { this.profile.set(profile); this.identity.patchValue({ name: profile.name ?? '', email: profile.email }); },
      error: () => this.error.set('Profil indisponible.'),
    });
  }
  protected initials() { return (this.profile()?.name || this.profile()?.email || 'A').split(/\s|@/).filter(Boolean).slice(0, 2).map(value => value[0].toUpperCase()).join(''); }
  protected roleLabel(role?: string) { return role === 'SUPER_ADMIN' ? 'Admin' : role === 'ADMIN' ? 'Content manager' : role === 'EDITOR' ? 'Planning planner' : ''; }
  protected saveProfile() {
    if (this.identity.invalid) return;
    this.saving.set(true); this.error.set(''); this.success.set('');
    this.api.put<Profile>('/admin/profile', this.identity.getRawValue()).subscribe({
      next: profile => { this.profile.set({ ...this.profile()!, ...profile }); this.saving.set(false); this.success.set('Profil mis à jour.'); },
      error: () => { this.saving.set(false); this.error.set('Impossible de mettre à jour le profil.'); },
    });
  }
  protected changePassword() {
    if (this.password.invalid) return;
    if (this.password.value.newPassword !== this.password.value.confirmation) { this.error.set('La confirmation ne correspond pas.'); return; }
    this.saving.set(true); this.error.set('');
    this.api.patch('/admin/profile/password', this.password.getRawValue()).subscribe({
      next: () => { this.api.logout(); void this.router.navigateByUrl('/admin/login'); },
      error: error => { this.saving.set(false); this.error.set(error.error?.message || 'Le mot de passe n’a pas pu être modifié.'); },
    });
  }
  protected logout() { this.api.logout(); }
}
