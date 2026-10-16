import { PartialType, OmitType, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional, IsNumber, IsString, IsIn, IsEmail, IsArray, ArrayMaxSize, MaxLength, Min, Max,
  ValidateNested, IsUrl, Matches, Allow,
} from 'class-validator';
import { CreateUserDto } from './create-user.dto';
import { CATEGORIES } from '../../../common/constants/categories';

export class CompanyDetailsDto {
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(80) industry?: string;
  @IsOptional() @IsString() @MaxLength(300) website?: string;
  @IsOptional() @IsString() @MaxLength(40) size?: string;
  @IsOptional() @IsString() @MaxLength(120) location?: string;
}

export class PortfolioProjectDto {
  @IsString() @MaxLength(40) id: string;
  @IsString() @MaxLength(120) title: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsUrl({ require_tld: false }, { message: 'portfolio link must be a valid URL' }) @MaxLength(500) url?: string;
}

/**
 * What a person may change about their own profile.
 *
 * `role` and `password` are deliberately not updatable here — each has its own
 * guarded path. The settings pages used to send email, phone, bio, company
 * details, portfolio and availability, every one of which this DTO did not
 * declare, so validation silently stripped them and the page said "saved".
 */
export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['role', 'password'] as const)) {
  @ApiPropertyOptional({ example: 'active', enum: ['active', 'suspended'] })
  @IsOptional() @IsIn(['active', 'suspended'])
  status?: string;

  // `walletBalance` is deliberately absent. A balance only changes through the
  // ledger (deposit, withdraw, escrow), which records why.

  @ApiPropertyOptional({ example: 'jane@gmail.com' })
  @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional() @IsString() @Matches(/^(\+\d{1,4}\d{4,14})?$/, { message: 'phone must be a country code followed by digits' })
  phone?: string;

  @ApiPropertyOptional({ example: '+91' })
  @IsOptional() @IsString() @MaxLength(6)
  phoneCountryCode?: string;

  @ApiPropertyOptional({ example: 'Product engineer with 8 years of experience.' })
  @IsOptional() @IsString() @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ type: CompanyDetailsDto })
  @IsOptional() @ValidateNested() @Type(() => CompanyDetailsDto)
  companyDetails?: CompanyDetailsDto;

  // ── Worker ──
  @ApiPropertyOptional({ example: 'Senior React Developer' })
  @IsOptional() @IsString() @MaxLength(120)
  jobTitle?: string;

  @ApiPropertyOptional({ example: 'Senior', enum: ['Junior', 'Mid-Level', 'Senior', 'Expert'] })
  @IsOptional() @IsIn(['', 'Junior', 'Mid-Level', 'Senior', 'Expert'])
  experienceLevel?: string;

  @ApiPropertyOptional({ example: 85 })
  @IsOptional() @IsNumber() @Min(0) @Max(10000)
  hourlyRate?: number;

  @ApiPropertyOptional({ example: ['English', 'Hindi'] })
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true })
  languages?: string[];

  @ApiPropertyOptional({ type: [PortfolioProjectDto] })
  @IsOptional() @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => PortfolioProjectDto)
  portfolioProjects?: PortfolioProjectDto[];

  /**
   * A worker's availability is a word ("Full-time"); a reviewer's is a small
   * object ({ status, maxCases, type }). The service checks the shape against
   * the account's role.
   */
  @ApiPropertyOptional({ example: 'Full-time' })
  @IsOptional() @Allow()
  availability?: any;

  // ── Expert ──
  @ApiPropertyOptional({ example: ['Web Development', 'Security'], description: 'Project categories this reviewer audits' })
  @IsOptional() @IsArray() @ArrayMaxSize(CATEGORIES.length) @IsIn(CATEGORIES as unknown as string[], { each: true })
  domains?: string[];
}

export class ChangePasswordDto {
  @ApiPropertyOptional({ example: 'Password@123' })
  @IsString()
  currentPassword: string;

  @ApiPropertyOptional({ example: 'NewPassw0rd!' })
  @IsString()
  newPassword: string;
}
