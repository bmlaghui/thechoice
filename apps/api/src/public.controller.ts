import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { ContactDto, CreateReservationDto, EventInquiryDto, ManagedReservationUpdateDto } from './dto';
import { Throttle } from '@nestjs/throttler';
@ApiTags('public')
@Controller()
export class PublicController {
  constructor(private readonly service: AppService) {}
  @Get('health') health() {
    return { status: 'ok' };
  }
  @Get('site/settings') settings() {
    return this.service.settings();
  }
  @Get('pages/:slug') page(@Param('slug') slug: string) {
    return this.service.page(slug);
  }
  @Get('menu/categories') categories() {
    return this.service.categories();
  }
  @Get('menu/categories/:slug') category(@Param('slug') slug: string) {
    return this.service.category(slug);
  }
  @Get('dishes') dishes() {
    return this.service.dishes();
  }
  @Get('dishes/:slug') dish(@Param('slug') slug: string) {
    return this.service.dish(slug);
  }
  @Get('gallery') gallery() {
    return this.service.gallery();
  }
  @Get('testimonials') testimonials() {
    return this.service.testimonials();
  }
  @Get('events') events() {
    return this.service.events();
  }
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reservations') reserve(@Body() dto: CreateReservationDto) {
    return this.service.reserve(dto);
  }
  @Get('reservations/manage/:token') managedReservation(@Param('token') token: string) {
    return this.service.managedReservation(token);
  }
  @Get('reservations/manage/:token/slots') managedReservationSlots(@Param('token') token: string, @Query('date') date: string, @Query('guests') guests?: string) {
    return this.service.managedReservationSlots(token, date, Number(guests) || 1);
  }
  @Patch('reservations/manage/:token/cancel') cancelManagedReservation(@Param('token') token: string) {
    return this.service.cancelManagedReservation(token);
  }
  @Patch('reservations/manage/:token') updateManagedReservation(@Param('token') token: string, @Body() dto: ManagedReservationUpdateDto) {
    return this.service.updateManagedReservation(token, dto);
  }
  @Get('reservations/slots') reservationSlots(
    @Query('date') date: string,
    @Query('guests') guests?: string,
  ) {
    return this.service.reservationSlots(date, Number(guests) || 1);
  }
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('contact')
  contact(@Body() dto: ContactDto) {
    return this.service.contact(dto);
  }
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('event-inquiries') inquiry(@Body() dto: EventInquiryDto) {
    return this.service.inquiry(dto);
  }
}
