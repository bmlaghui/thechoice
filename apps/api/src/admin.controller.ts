import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { readFile, unlink } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { diskStorage } from 'multer';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Role } from './generated/prisma/client';
import { AuthUser, JwtAuthGuard, Roles, RolesGuard } from './auth';
import { AdminService } from './admin.service';
import {
  CategoryDto, CreateReservationDto, DishDto, EventInquiryDto, EventOfferDto, GalleryDto, ListQueryDto, MediaAssetDto, OpeningHourDto, SpecialOpeningHourDto,
  PageDto, ReservationUpdateDto, SettingDto, SocialLinkDto, UserDto, EventInquiryUpdateDto, ReorderCategoriesDto, ReorderDishesDto, ReorderGalleryDto, ReplyMessageDto, UserProfileDto, ChangePasswordDto, RolePolicyDto, ResetUserPasswordDto, TestimonialDto, ReorderTestimonialsDto,
} from './dto';

type RequestWithUser = { user: AuthUser };
const uploadDirectory=resolve(process.env.UPLOAD_DIR??resolve(process.cwd(),'../web/public/uploads'));
mkdirSync(uploadDirectory,{recursive:true});

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}
  @Get('dashboard') dashboard() { return this.service.dashboard(); }
  @Get('exports/:resource') async export(@Param('resource') resource: string, @Res() response: Response) {
    const file = await this.service.exportCsv(resource);
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    response.send(`\uFEFF${file.csv}`);
  }

  @Get('pages') pages(@Query() q: ListQueryDto) { return this.service.pages(q); }
  @Post('pages') createPage(@Body() dto: PageDto, @Req() req: RequestWithUser) { return this.service.savePage(undefined, dto, req.user); }
  @Put('pages/:id') updatePage(@Param('id') id: string, @Body() dto: PageDto, @Req() req: RequestWithUser) { return this.service.savePage(id, dto, req.user); }
  @Delete('pages/:id') deletePage(@Param('id') id: string, @Req() req: RequestWithUser) { return this.service.deletePage(id, req.user); }

  @Get('categories') categories(@Query() q: ListQueryDto) { return this.service.categories(q); }
  @Post('categories') createCategory(@Body() dto: CategoryDto, @Req() req: RequestWithUser) { return this.service.saveCategory(undefined, dto, req.user); }
  @Put('categories/:id') updateCategory(@Param('id') id: string, @Body() dto: CategoryDto, @Req() req: RequestWithUser) { return this.service.saveCategory(id, dto, req.user); }
  @Delete('categories/:id') deleteCategory(@Param('id') id: string, @Req() req: RequestWithUser) { return this.service.deleteCategory(id, req.user); }
  @Patch('categories/reorder/all') reorderCategories(@Body() dto: ReorderCategoriesDto, @Req() req: RequestWithUser) { return this.service.reorderCategories(dto.ids, req.user); }

  @Post('media/upload')
  @UseInterceptors(FileInterceptor('file', { storage: diskStorage({ destination: uploadDirectory, filename: (_request, file, callback) => callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`) }), limits: { fileSize: 8_000_000 }, fileFilter: (_request, file, callback) => callback(file.mimetype.startsWith('image/') ? null : new Error('Le fichier doit être une image'), file.mimetype.startsWith('image/')) }))
  async uploadMedia(@UploadedFile() file: { filename: string; originalname: string; mimetype: string; size: number;path:string }) {const bytes=await readFile(file.path);const valid=(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)||(bytes[0]===0x89&&bytes.subarray(1,4).toString()==='PNG')||(bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP')||bytes.subarray(4,12).toString().includes('ftyp');if(!valid){await unlink(file.path);throw new BadRequestException('Signature de fichier image invalide');}return this.service.createMedia({filename:file.originalname,mimeType:file.mimetype,size:file.size,url:`/uploads/${file.filename}`,alt:file.originalname.replace(/\.[^.]+$/,'')}); }
  @Get('media') media() { return this.service.media(); }
  @Put('media/:id') updateMedia(@Param('id') id:string,@Body() dto:MediaAssetDto,@Req() req:RequestWithUser){return this.service.updateMedia(id,dto.alt,req.user);}
  @Delete('media/:id') deleteMedia(@Param('id') id:string,@Req() req:RequestWithUser){return this.service.deleteMedia(id,req.user);}

  @Get('dishes') dishes(@Query() q: ListQueryDto) { return this.service.dishes(q); }
  @Get('allergens') allergens() { return this.service.allergens(); }
  @Post('dishes') createDish(@Body() dto: DishDto, @Req() req: RequestWithUser) { return this.service.saveDish(undefined, dto, req.user); }
  @Put('dishes/:id') updateDish(@Param('id') id: string, @Body() dto: DishDto, @Req() req: RequestWithUser) { return this.service.saveDish(id, dto, req.user); }
  @Delete('dishes/:id') deleteDish(@Param('id') id: string, @Req() req: RequestWithUser) { return this.service.deleteDish(id, req.user); }
  @Patch('dishes/reorder/all') reorderDishes(@Body() dto: ReorderDishesDto, @Req() req: RequestWithUser) { return this.service.reorderDishes(dto.ids, req.user); }

  @Get('gallery') gallery(@Query() q: ListQueryDto) { return this.service.gallery(q); }
  @Post('gallery') createGallery(@Body() dto: GalleryDto, @Req() req: RequestWithUser) { return this.service.saveGallery(undefined, dto, req.user); }
  @Put('gallery/:id') updateGallery(@Param('id') id: string, @Body() dto: GalleryDto, @Req() req: RequestWithUser) { return this.service.saveGallery(id, dto, req.user); }
  @Delete('gallery/:id') deleteGallery(@Param('id') id: string, @Req() req: RequestWithUser) { return this.service.deleteGallery(id, req.user); }
  @Patch('gallery/reorder/all') reorderGallery(@Body() dto: ReorderGalleryDto, @Req() req: RequestWithUser) { return this.service.reorderGallery(dto.ids, req.user); }

  @Get('testimonials') testimonials(@Query() q:ListQueryDto){return this.service.testimonials(q);}
  @Post('testimonials') createTestimonial(@Body() dto:TestimonialDto,@Req() req:RequestWithUser){return this.service.saveTestimonial(undefined,dto,req.user);}
  @Put('testimonials/:id') updateTestimonial(@Param('id') id:string,@Body() dto:TestimonialDto,@Req() req:RequestWithUser){return this.service.saveTestimonial(id,dto,req.user);}
  @Delete('testimonials/:id') deleteTestimonial(@Param('id') id:string,@Req() req:RequestWithUser){return this.service.deleteTestimonial(id,req.user);}
  @Patch('testimonials/reorder/all') reorderTestimonials(@Body() dto:ReorderTestimonialsDto,@Req() req:RequestWithUser){return this.service.reorderTestimonials(dto.ids,req.user);}

  @Get('events') events(@Query() q: ListQueryDto) { return this.service.events(q); }
  @Post('events') createEvent(@Body() dto: EventOfferDto, @Req() req: RequestWithUser) { return this.service.saveEvent(undefined, dto, req.user); }
  @Put('events/:id') updateEvent(@Param('id') id: string, @Body() dto: EventOfferDto, @Req() req: RequestWithUser) { return this.service.saveEvent(id, dto, req.user); }
  @Delete('events/:id') deleteEvent(@Param('id') id: string, @Req() req: RequestWithUser) { return this.service.deleteEvent(id, req.user); }

  @Get('reservations') reservations(@Query() q: ListQueryDto) { return this.service.reservations(q); }
  @Post('reservations') createReservation(@Body() dto: CreateReservationDto, @Req() req: RequestWithUser) { return this.service.createReservation(dto, req.user); }
  @Patch('reservations/:id') updateReservation(@Param('id') id: string, @Body() dto: ReservationUpdateDto, @Req() req: RequestWithUser) { return this.service.updateReservation(id, dto, req.user); }
  @Delete('reservations/:id') deleteReservation(@Param('id') id: string, @Req() req: RequestWithUser) { return this.service.deleteReservation(id, req.user); }
  @Get('messages') messages(@Query() q: ListQueryDto) { return this.service.messages(q); }
  @Patch('messages/:id/read') readMessage(@Param('id') id: string, @Req() req: RequestWithUser) { return this.service.readMessage(id, req.user); }
  @Patch('messages/:id/unread') unreadMessage(@Param('id') id: string, @Req() req: RequestWithUser) { return this.service.unreadMessage(id, req.user); }
  @Post('messages/:id/reply') replyMessage(@Param('id') id: string, @Body() dto: ReplyMessageDto, @Req() req: RequestWithUser) { return this.service.replyMessage(id, dto, req.user); }
  @Delete('messages/:id') deleteMessage(@Param('id') id: string, @Req() req: RequestWithUser) { return this.service.deleteMessage(id, req.user); }
  @Get('event-inquiries') inquiries(@Query() q: ListQueryDto) { return this.service.inquiries(q); }
  @Post('event-inquiries') createInquiry(@Body() dto: EventInquiryDto, @Req() req: RequestWithUser) { return this.service.createInquiry(dto, req.user); }
  @Put('event-inquiries/:id') updateInquiry(@Param('id') id: string, @Body() dto: EventInquiryUpdateDto, @Req() req: RequestWithUser) { return this.service.updateInquiry(id, dto, req.user); }
  @Patch('event-inquiries/:id') rescheduleInquiry(@Param('id') id: string, @Body() dto: EventInquiryUpdateDto, @Req() req: RequestWithUser) { return this.service.updateInquiry(id, dto, req.user); }
  @Delete('event-inquiries/:id') deleteInquiry(@Param('id') id: string, @Req() req: RequestWithUser) { return this.service.deleteInquiry(id, req.user); }

  @Get('settings') settings() { return this.service.settings(); }
  @Put('settings/:key') setting(@Param('key') key: string, @Body() dto: SettingDto, @Req() req: RequestWithUser) { return this.service.saveSetting(key, dto.value, req.user); }
  @Get('opening-hours') hours() { return this.service.hours(); }
  @Put('opening-hours/:day') hour(@Param('day') day: string, @Body() dto: OpeningHourDto, @Req() req: RequestWithUser) { return this.service.saveHour(Number(day), dto, req.user); }
  @Get('special-opening-hours') specialHours() { return this.service.specialHours(); }
  @Post('special-opening-hours') createSpecialHour(@Body() dto: SpecialOpeningHourDto, @Req() req: RequestWithUser) { return this.service.saveSpecialHour(undefined, dto, req.user); }
  @Put('special-opening-hours/:id') updateSpecialHour(@Param('id') id: string, @Body() dto: SpecialOpeningHourDto, @Req() req: RequestWithUser) { return this.service.saveSpecialHour(id, dto, req.user); }
  @Delete('special-opening-hours/:id') deleteSpecialHour(@Param('id') id: string, @Req() req: RequestWithUser) { return this.service.deleteSpecialHour(id, req.user); }
  @Get('social-links') social() { return this.service.social(); }
  @Put('social-links/:platform') socialLink(@Param('platform') platform: string, @Body() dto: SocialLinkDto, @Req() req: RequestWithUser) { return this.service.saveSocial(platform, dto, req.user); }

  @Get('users') users() { return this.service.users(); }
  @Post('users') createUser(@Body() dto: UserDto, @Req() req: RequestWithUser) { return this.service.saveUser(undefined, dto, req.user); }
  @Put('users/:id') updateUser(@Param('id') id: string, @Body() dto: UserDto, @Req() req: RequestWithUser) { return this.service.saveUser(id, dto, req.user); }
  @Patch('users/:id/password') userPassword(@Param('id') id:string,@Body() dto:ResetUserPasswordDto,@Req() req:RequestWithUser){return this.service.resetUserPassword(id,dto,req.user);}
  @Patch('users/:id/block') blockUser(@Param('id') id:string,@Req() req:RequestWithUser){return this.service.setUserBlocked(id,true,req.user);}
  @Patch('users/:id/unblock') unblockUser(@Param('id') id:string,@Req() req:RequestWithUser){return this.service.setUserBlocked(id,false,req.user);}
  @Patch('users/:id/revoke-sessions') revokeUser(@Param('id') id:string,@Req() req:RequestWithUser){return this.service.revokeUserSessions(id,req.user);}
  @Delete('users/:id') deleteUser(@Param('id') id:string,@Req() req:RequestWithUser){return this.service.deleteUser(id,req.user);}

  @Get('profile') profile(@Req() req:RequestWithUser){return this.service.profile(req.user.sub);}
  @Put('profile') updateProfile(@Body() dto:UserProfileDto,@Req() req:RequestWithUser){return this.service.updateProfile(dto,req.user);}
  @Patch('profile/password') changePassword(@Body() dto:ChangePasswordDto,@Req() req:RequestWithUser){return this.service.changePassword(dto,req.user);}
  @Get('role-policies') rolePolicies(){return this.service.rolePolicies();}
  @Put('role-policies/:role') rolePolicy(@Param('role') role:Role,@Body() dto:RolePolicyDto,@Req() req:RequestWithUser){return this.service.saveRolePolicy(role,dto,req.user);}
}
