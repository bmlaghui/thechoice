import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AdminApiService } from './admin-api.service';
import { catchError, map, of } from 'rxjs';

export const adminGuard: CanActivateFn = (route) => {
  const api = inject(AdminApiService);
  const router = inject(Router);
  const destination = () =>
    route.routeConfig?.path === 'admin' &&
    api.user()?.role === 'EDITOR' &&
    route.queryParamMap.get('workspace') !== 'standard'
      ? router.createUrlTree(['/admin/reservations'])
      : true;
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return true;
  return api.authenticated()
    ? destination()
    : api.restore().pipe(
        map(() => destination()),
        catchError(() => of(router.createUrlTree(['/admin/login']))),
      );
};
