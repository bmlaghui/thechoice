import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AdminApiService } from './admin-api.service';
export const sessionInterceptor: HttpInterceptorFn = (request, next) => {
  const api = inject(AdminApiService);
  const csrf =
    typeof document === 'undefined'
      ? null
      : document.cookie
          .split(';')
          .map((value) => value.trim())
          .find((value) => value.startsWith('tc_csrf='))
          ?.slice(8);
  const withSecurity = request.clone({
    withCredentials: true,
    setHeaders:
      csrf && !['GET', 'HEAD', 'OPTIONS'].includes(request.method) ? { 'X-CSRF-Token': csrf } : {},
  });
  return next(withSecurity).pipe(
    catchError((error: HttpErrorResponse) => {
      if (
        error.status !== 401 ||
        request.url.includes('/auth/login') ||
        request.url.includes('/auth/refresh')
      )
        return throwError(() => error);
      return api
        .post<{ user: { id: string; email: string; role: string } }>('/auth/refresh', {})
        .pipe(
          switchMap((result) => {
            api.user.set(result.user);
            return next(withSecurity);
          }),
          catchError((refreshError) => {
            api.user.set(null);
            return throwError(() => refreshError);
          }),
        );
    }),
  );
};
