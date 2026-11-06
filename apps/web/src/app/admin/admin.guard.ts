import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AdminApiService } from './admin-api.service';
import { catchError, map, of } from 'rxjs';

export const adminGuard: CanActivateFn = () => {
  const api = inject(AdminApiService);
  const router=inject(Router);if(!isPlatformBrowser(inject(PLATFORM_ID)))return true;return api.authenticated()?true:api.restore().pipe(map(()=>true),catchError(()=>of(router.createUrlTree(['/admin/login']))));
};
