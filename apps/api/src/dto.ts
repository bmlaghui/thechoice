import {
  IsArray,
  IsEnum,
  IsNumber,
  IsObject,
  IsUUID,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PublishStatus,
  ReservationStatus,
  Role,
} from './generated/prisma/enums';
export class CreateReservationDto {
  @IsDateString() date!: string;
  @IsString() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) time!: string;
  @IsInt() @Min(1) @Max(30) guests!: number;
  @IsString() @MaxLength(100) name!: string;
  @IsEmail() email!: string;
  @IsString() phone!: string;
  @IsOptional() @IsString() @MaxLength(1000) message?: string;
  @IsBoolean() consent!: boolean;
  @IsOptional() @IsString() @MaxLength(200) website?: string;
  @IsOptional() @IsNumber() submittedAt?: number;
  @IsOptional() @IsString() @MaxLength(2048) turnstileToken?: string;
}
export class ReservationSlotsQueryDto {
  @IsDateString() date!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(30) guests = 2;
}
export class SpecialOpeningHourDto {
  @IsDateString() date!: string;
  @IsOptional() @IsString() @MaxLength(160) label?: string;
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) opensAt?: string;
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) closesAt?: string;
  @IsBoolean() closed!: boolean;
  @IsOptional() @IsInt() @Min(1) capacityOverride?: number;
}
export class ManagedReservationUpdateDto {
  @IsDateString() date!: string;
  @IsString() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) time!: string;
  @IsInt() @Min(1) @Max(30) guests!: number;
}
export class MediaAssetDto {
  @IsString() @MaxLength(240) alt!: string;
}
export class ContactDto {
  @IsString() name!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() phone?: string;
  @IsString() @MaxLength(2000) message!: string;
  @IsOptional() @IsString() @MaxLength(200) website?: string;
  @IsOptional() @IsNumber() submittedAt?: number;
  @IsOptional() @IsString() @MaxLength(2048) turnstileToken?: string;
}
export class ReplyMessageDto {
  @IsString() @MaxLength(180) subject!: string;
  @IsString() @MaxLength(10000) html!: string;
}
export class EventInquiryDto extends ContactDto {
  @IsString() eventType!: string;
  @IsOptional() @IsDateString() eventDate?: string;
  @IsOptional() @IsInt() guests?: number;
}

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MaxLength(200) password!: string;
}

export class RefreshDto {
  @IsString() refreshToken!: string;
}

export class ListQueryDto {
  @Type(() => Number) @IsInt() @Min(1) @IsOptional() page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) @IsOptional() limit = 20;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsString() sortBy?: string;
  @IsOptional() @IsIn(['asc', 'desc']) sortOrder: 'asc' | 'desc' = 'asc';
}

export class PageDto {
  @IsString() @MaxLength(160) title!: string;
  @IsString() @MaxLength(160) slug!: string;
  @IsEnum(PublishStatus) status!: PublishStatus;
  @IsOptional() @IsArray() blocks?: Array<{
    type: string;
    content: unknown;
    order?: number;
  }>;
  @IsOptional() @IsObject() seo?: { title: string; description: string };
}

export class CategoryDto {
  @IsString() name!: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() @MaxLength(160) eyebrow?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() @MaxLength(240) imageAlt?: string;
  @IsOptional() @IsInt() order?: number;
  @IsBoolean() active!: boolean;
}
export class ReorderCategoriesDto {
  @IsArray() @IsUUID(undefined, { each: true }) ids!: string[];
}

export class DishDto {
  @IsString() name!: string;
  @IsOptional() @IsString() slug?: string;
  @IsString() description!: string;
  @IsOptional() @IsString() @MaxLength(160) eyebrow?: string;
  @IsOptional() @IsString() @MaxLength(500) chefQuote?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) badges?: string[];
  @Type(() => Number) @IsNumber() @Min(0) price!: number;
  @IsArray() @IsString({ each: true }) ingredients!: string[];
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() @MaxLength(240) imageAlt?: string;
  @IsBoolean() available!: boolean;
  @IsBoolean() featured!: boolean;
  @IsBoolean() vegetarian!: boolean;
  @IsOptional() @IsBoolean() halal?: boolean;
  @IsBoolean() spicy!: boolean;
  @IsOptional() @IsInt() order?: number;
  @IsUUID() categoryId!: string;
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  allergenIds?: string[];
  @IsOptional() @IsArray() images?: Array<{
    url: string;
    alt: string;
    order?: number;
  }>;
}
export class ReorderDishesDto {
  @IsArray() @IsUUID(undefined, { each: true }) ids!: string[];
}

export class GalleryDto {
  @IsString() title!: string;
  @IsString() category!: string;
  @IsString() imageUrl!: string;
  @IsString() alt!: string;
  @IsOptional() @IsInt() order?: number;
  @IsBoolean() published!: boolean;
}
export class ReorderGalleryDto {
  @IsArray() @IsUUID(undefined, { each: true }) ids!: string[];
}
export class TestimonialDto {
  @IsString() @MaxLength(100) author!: string;
  @IsString() @MaxLength(120) context!: string;
  @IsString() @MaxLength(1000) quote!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(5) rating!: number;
  @IsOptional() @IsString() avatarUrl?: string;
  @IsOptional() @IsString() @MaxLength(240) avatarAlt?: string;
  @IsBoolean() published!: boolean;
  @IsBoolean() featured!: boolean;
  @IsOptional() @IsInt() order?: number;
}
export class ReorderTestimonialsDto {
  @IsArray() @IsUUID(undefined, { each: true }) ids!: string[];
}

export class EventOfferDto {
  @IsString() title!: string;
  @IsString() slug!: string;
  @IsString() description!: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsBoolean() published!: boolean;
}

export class ReservationUpdateDto {
  @IsOptional() @IsEnum(ReservationStatus) expectedStatus?: ReservationStatus;
  @IsOptional() @IsEnum(ReservationStatus) status?: ReservationStatus;
  @IsOptional() @IsString() @MaxLength(3000) internalNotes?: string;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsString() time?: string;
  @IsOptional() @IsInt() @Min(1) @Max(30) guests?: number;
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() @MaxLength(1000) message?: string;
}

export class EventInquiryUpdateDto {
  @IsOptional() @IsIn(['NEW', 'CONTACTED', 'QUOTED', 'WON', 'LOST']) status?: string;
  @IsOptional() @IsString() @MaxLength(3000) internalNotes?: string;
  @IsOptional() @IsDateString() eventDate?: string;
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() eventType?: string;
  @IsOptional() @IsInt() @Min(1) guests?: number;
  @IsOptional() @IsString() @MaxLength(2000) message?: string;
}

export class SettingDto {
  @IsOptional() @IsString() key?: string;
  @IsObject() value!: Record<string, unknown>;
}

export class OpeningHourDto {
  @IsOptional() @IsInt() @Min(0) @Max(6) day?: number;
  @IsString() label!: string;
  @IsOptional() @IsString() opensAt?: string;
  @IsOptional() @IsString() closesAt?: string;
  @IsBoolean() closed!: boolean;
}

export class SocialLinkDto {
  @IsOptional() @IsString() platform?: string;
  @IsString() url!: string;
  @IsBoolean() active!: boolean;
}

export class UserDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsEmail() email!: string;
  @IsEnum(Role) role!: Role;
  @IsOptional()
  @IsString()
  @MinLength(15)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message:
      'Le mot de passe doit contenir majuscule, minuscule, chiffre et symbole',
  })
  password?: string;
}
export class UserProfileDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsEmail() email!: string;
}
export class ChangePasswordDto {
  @IsString() currentPassword!: string;
  @IsString()
  @MinLength(15)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message:
      'Le mot de passe doit contenir majuscule, minuscule, chiffre et symbole',
  })
  newPassword!: string;
  @IsString() confirmation!: string;
}
export class RolePolicyDto {
  @IsString() @MaxLength(80) label!: string;
  @IsOptional() @IsString() @MaxLength(300) description?: string;
  @IsArray() @IsString({ each: true }) permissions!: string[];
}
export class ResetUserPasswordDto {
  @IsString()
  @MinLength(15)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message:
      'Le mot de passe doit contenir majuscule, minuscule, chiffre et symbole',
  })
  password!: string;
  @IsString() confirmation!: string;
}
export class AcceptInvitationDto {
  @IsString() token!: string;
  @IsString()
  @MinLength(15)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
  password!: string;
  @IsString() confirmation!: string;
}
