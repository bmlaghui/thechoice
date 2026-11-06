import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from './prisma.service';
import { Role } from './generated/prisma/client';

export type AuthUser = { sub: string; email: string; role: Role };
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

@Injectable()
export class AuthService {
  private readonly accessTtl: string;
  private readonly refreshDays: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.accessTtl = config.get('JWT_ACCESS_TTL', '15m');
    this.refreshDays = Number(config.get('JWT_REFRESH_DAYS', 30));
  }

  async login(email: string, password: string,meta?:{userAgent?:string;ipAddress?:string}) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) throw new UnauthorizedException('Identifiants invalides');
    if (!user.active || user.manuallyBlocked) throw new ForbiddenException('Compte bloqué. Contactez un administrateur.');
    if (user.lockedUntil && user.lockedUntil > new Date()) throw new ForbiddenException('Compte temporairement verrouillé après plusieurs échecs.');
    if (!(await argon2.verify(user.passwordHash, password))) {
      const attempts=user.failedLoginAttempts+1,lockedUntil=attempts>=5?new Date(Date.now()+15*60_000):null;
      await this.prisma.user.update({where:{id:user.id},data:{failedLoginAttempts:lockedUntil?0:attempts,lockedUntil}});
      throw new UnauthorizedException('Identifiants invalides');
    }
    await this.prisma.user.update({where:{id:user.id},data:{failedLoginAttempts:0,lockedUntil:null,lastLoginAt:new Date()}});
    return this.issue(user.id, user.email, user.role,meta);
  }

  async refresh(token: string,meta?:{userAgent?:string;ipAddress?:string}) {
    const tokenHash = this.hash(token);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!stored || stored.expiresAt <= new Date() || !stored.user.active || stored.user.manuallyBlocked || (stored.user.lockedUntil && stored.user.lockedUntil > new Date())) throw new UnauthorizedException('Session expirée');
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.issue(stored.user.id, stored.user.email, stored.user.role,meta);
  }

  async logout(token: string) {
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash: this.hash(token) } });
    return { success: true };
  }
  async acceptInvitation(token:string,password:string,confirmation:string){if(password!==confirmation)throw new UnauthorizedException('La confirmation ne correspond pas');const invitation=await this.prisma.userInvitation.findUnique({where:{tokenHash:this.hash(token)},include:{user:true}});if(!invitation||invitation.usedAt||invitation.expiresAt<=new Date())throw new UnauthorizedException('Invitation invalide ou expirée');await this.prisma.$transaction([this.prisma.user.update({where:{id:invitation.userId},data:{passwordHash:await argon2.hash(password),passwordChangedAt:new Date(),manuallyBlocked:false,active:true}}),this.prisma.userInvitation.update({where:{id:invitation.id},data:{usedAt:new Date()}})]);return{success:true};}
  sessions(userId:string){return this.prisma.refreshToken.findMany({where:{userId},select:{id:true,userAgent:true,ipAddress:true,createdAt:true,lastUsedAt:true,expiresAt:true},orderBy:{lastUsedAt:'desc'}});}
  async revokeSession(userId:string,id:string){await this.prisma.refreshToken.deleteMany({where:{id,userId}});return{success:true};}

  private async issue(id: string, email: string, role: Role,meta?:{userAgent?:string;ipAddress?:string}) {
    const payload: AuthUser = { sub: id, email, role };
    const accessToken = await this.jwt.signAsync(payload, { expiresIn: this.accessTtl as never });
    const refreshToken = `${randomUUID()}.${randomUUID()}`;
    const expiresAt = new Date(Date.now() + this.refreshDays * 86_400_000);
    await this.prisma.refreshToken.create({ data: { tokenHash: this.hash(refreshToken), expiresAt, userId: id,userAgent:meta?.userAgent,ipAddress:meta?.ipAddress } });
    return { accessToken, refreshToken, expiresAt, user: { id, email, role } };
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string;cookie?:string }; user?: AuthUser }>();
    const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1] ?? request.headers.cookie?.split(';').map(value=>value.trim()).find(value=>value.startsWith('tc_access='))?.slice('tc_access='.length);
    if (!token) throw new UnauthorizedException('Authentification requise');
    try {
      request.user = await this.jwt.verifyAsync<AuthUser>(token);
      const account=await this.prisma.user.findUnique({where:{id:request.user.sub},select:{active:true,manuallyBlocked:true,lockedUntil:true}});
      if(!account||!account.active||account.manuallyBlocked||(account.lockedUntil&&account.lockedUntil>new Date()))throw new UnauthorizedException('Compte bloqué ou session révoquée');
      return true;
    } catch {
      throw new UnauthorizedException('Jeton invalide ou expiré');
    }
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector,private readonly prisma:PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<Role[]>('roles', [context.getHandler(), context.getClass()]);
    const user = context.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    if (!user || (roles?.length&&!roles.includes(user.role))) throw new ForbiddenException('Droits insuffisants');
    if(user.role!==Role.SUPER_ADMIN){const request=context.switchToHttp().getRequest<{url:string;method:string}>();const permission=this.permissionFor(request.url,request.method);if(permission){const policy=await this.prisma.rolePolicy.findUnique({where:{role:user.role}});if(!policy?.permissions.includes(permission))throw new ForbiddenException('Cette action n’est pas autorisée pour votre rôle');}}
    return true;
  }
  private permissionFor(url:string,method:string){if(url.includes('/users'))return'MANAGE_USERS';if(url.includes('/role-policies'))return'MANAGE_ROLES';if(url.includes('/reservations')||url.includes('/event-inquiries'))return'MANAGE_PLANNING';if(url.includes('/messages'))return'MANAGE_MESSAGES';if(url.includes('/opening-hours'))return'MANAGE_HOURS';if(url.includes('/categories')||url.includes('/dishes')||url.includes('/gallery')||url.includes('/testimonials')||url.includes('/media')||url.includes('/pages')||url.includes('/events')||url.includes('/settings')||url.includes('/social-links'))return method==='GET'?'VIEW_CONTENT':'MANAGE_CONTENT';return undefined;}
}
