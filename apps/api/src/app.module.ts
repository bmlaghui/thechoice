import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { PublicController } from './public.controller';
import { AdminController } from './admin.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { AuthController } from './auth.controller';
import { AdminService } from './admin.service';
import { AuthService, JwtAuthGuard, RolesGuard } from './auth';
import { EmailService } from './email.service';
import { ReservationAvailabilityService } from './reservation-availability.service';
import { CaptchaService } from './captcha.service';
import { ReservationReminderService } from './reservation-reminder.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'development-secret-change-me'),
      }),
    }),
  ],
  controllers: [PublicController, AdminController, AuthController],
  providers: [
    AppService,
    AdminService,
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    PrismaService,
    EmailService,
    ReservationAvailabilityService,
    CaptchaService,
    ReservationReminderService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
