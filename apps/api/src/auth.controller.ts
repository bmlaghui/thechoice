import { Body, Controller, Delete, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService, AuthUser, JwtAuthGuard } from './auth';
import { AcceptInvitationDto, LoginDto, RefreshDto } from './dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('login')
  async login(@Body() dto: LoginDto,@Req() request:{headers:{'user-agent'?:string};ip?:string},@Res({passthrough:true}) response:Response) { const session=await this.auth.login(dto.email,dto.password,{userAgent:request.headers['user-agent'],ipAddress:request.ip});this.cookies(response,session.accessToken,session.refreshToken);return{user:session.user,expiresAt:session.expiresAt}; }

  @Post('refresh')
  async refresh(@Req() request:{headers:{cookie?:string;'user-agent'?:string};ip?:string},@Res({passthrough:true}) response:Response) {const token=this.cookie(request.headers.cookie,'tc_refresh');const session=await this.auth.refresh(token??'',{userAgent:request.headers['user-agent'],ipAddress:request.ip});this.cookies(response,session.accessToken,session.refreshToken,this.cookie(request.headers.cookie,'tc_csrf'));return{user:session.user,expiresAt:session.expiresAt};}

  @Post('logout')
  async logout(@Req() request:{headers:{cookie?:string}},@Res({passthrough:true}) response:Response) {const token=this.cookie(request.headers.cookie,'tc_refresh');if(token)await this.auth.logout(token);response.clearCookie('tc_access',{path:'/'});response.clearCookie('tc_refresh',{path:'/api/v1/auth'});response.clearCookie('tc_csrf',{path:'/'});return{success:true};}

  @UseGuards(JwtAuthGuard)
  @Get('me') me(@Req() request:{user:AuthUser}){return{user:request.user};}
  @Post('invitation/accept') acceptInvitation(@Body() dto:AcceptInvitationDto){return this.auth.acceptInvitation(dto.token,dto.password,dto.confirmation);}
  @UseGuards(JwtAuthGuard) @Get('sessions') sessions(@Req() request:{user:AuthUser}){return this.auth.sessions(request.user.sub);}
  @UseGuards(JwtAuthGuard) @Delete('sessions/:id') revokeSession(@Param('id') id:string,@Req() request:{user:AuthUser}){return this.auth.revokeSession(request.user.sub,id);}
  private cookie(header:string|undefined,name:string){return header?.split(';').map(value=>value.trim()).find(value=>value.startsWith(`${name}=`))?.slice(name.length+1);}
  private cookies(response:Response,access:string,refresh:string,csrf:string=randomUUID()){const secure=process.env.NODE_ENV==='production';response.cookie('tc_access',access,{httpOnly:true,secure,sameSite:'strict',path:'/',maxAge:15*60_000});response.cookie('tc_refresh',refresh,{httpOnly:true,secure,sameSite:'strict',path:'/api/v1/auth',maxAge:30*86_400_000});response.cookie('tc_csrf',csrf,{httpOnly:false,secure,sameSite:'strict',path:'/',maxAge:30*86_400_000});}
}
