import { HttpClient, HttpHeaders } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

export type AdminUser = { id: string; email: string; role: string };
export type LoginResponse = { expiresAt: string; user: AdminUser };
export type PageResult<T = Record<string, unknown>> = { data: T[]; meta: { page: number; limit: number; total: number; pages: number } };

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = ['4200', '4201'].includes(globalThis.location?.port ?? '')
    ? 'http://localhost:3000/api/v1'
    : '/api/v1';
  readonly user = signal<AdminUser | null>(null);
  readonly authenticated = computed(() => !!this.user());

  login(email: string, password: string) {
    return this.http.post<LoginResponse>(`${this.base}/auth/login`, { email, password },{withCredentials:true}).pipe(tap((response) => this.user.set(response.user)));
  }
  logout() {
    this.http.post(`${this.base}/auth/logout`, {},{withCredentials:true}).subscribe({ error: () => undefined });
    this.user.set(null);
    void this.router.navigateByUrl('/admin/login');
  }
  restore(){return this.http.get<{user:AdminUser}>(`${this.base}/auth/me`,{withCredentials:true}).pipe(tap(result=>this.user.set(result.user)));}
  get<T>(path: string, params?: Record<string, string | number>) { return this.http.get<T>(`${this.base}${path}`, { withCredentials:true, params }); }
  post<T>(path: string, body: unknown) { return this.http.post<T>(`${this.base}${path}`, body, { withCredentials:true }); }
  put<T>(path: string, body: unknown) { return this.http.put<T>(`${this.base}${path}`, body, { withCredentials:true }); }
  patch<T>(path: string, body: unknown) { return this.http.patch<T>(`${this.base}${path}`, body, { withCredentials:true }); }
  delete<T>(path: string) { return this.http.delete<T>(`${this.base}${path}`, { withCredentials:true }); }
  upload<T>(path: string, file: File) { const body = new FormData(); body.append('file', file); return this.http.post<T>(`${this.base}${path}`, body, { withCredentials:true }); }
  download(path: string) { return this.http.get(`${this.base}${path}`, { withCredentials: true, responseType: 'blob' }); }
}
