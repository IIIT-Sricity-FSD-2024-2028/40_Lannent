import { PartialType } from '@nestjs/swagger';
import { CreateMilestoneDto } from './create-milestone.dto';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMilestoneDto extends PartialType(CreateMilestoneDto) {
  @ApiPropertyOptional({ example: 'in-progress', enum: ['pending', 'in-progress', 'submitted', 'review', 'completed', 'approved', 'disputed', 'audit-passed', 'revision-needed'] })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional() @IsNumber()
  progress?: number;
}

/** A file in the store, as a deliverable references it. */
export class FileRefDto {
  @ApiPropertyOptional({ example: 'f_1788258506029_100' })
  @IsOptional() @IsString() @MaxLength(64)
  id?: string;

  @ApiPropertyOptional({ example: 'screens.pdf' })
  @IsString() @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 248192 })
  @IsOptional() @IsNumber()
  size?: number;

  @ApiPropertyOptional({ example: 'application/pdf' })
  @IsOptional() @IsString() @MaxLength(128)
  mime?: string;

  @ApiPropertyOptional({ example: '/api/files/f_1788258506029_100' })
  @IsOptional() @IsString() @MaxLength(512)
  url?: string;
}

/**
 * What a worker actually submits. This was `any` behind an `@IsObject()`, which
 * meant `whitelist: true` had nothing to whitelist — any shape at all was
 * accepted and stored verbatim, then rendered straight into the client's
 * review page.
 */
export class DeliverableDto {
  @ApiPropertyOptional({ example: 'UI Implementation v1' })
  @IsOptional() @IsString() @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'All screens implemented with navigation' })
  @IsOptional() @IsString() @MaxLength(5000)
  description?: string;

  /**
   * `@IsOptional()` only skips `null` and `undefined`, so a form that posts its
   * blank optional fields as `""` was failing `@IsUrl` and taking the whole
   * submission down with it — deliverable and all. An empty field means "not
   * provided", so normalise it to that before the URL check runs.
   */
  @ApiPropertyOptional({ example: 'https://github.com/example/mobile-app' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsUrl({ require_tld: false }, { message: 'link must be a valid URL' })
  @MaxLength(2000)
  link?: string;

  @ApiPropertyOptional({ example: 'feat/design-tokens' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsString() @MaxLength(255)
  branch?: string;

  /**
   * Files attached to the submission.
   *
   * A bare string is still accepted and normalised to `{ name }` — submissions
   * predate the file store, and their filenames are all that was ever kept.
   */
  @ApiPropertyOptional({ type: [FileRefDto] })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map(v => (typeof v === 'string' ? { name: v } : v)) : value,
  )
  @ValidateNested({ each: true })
  @Type(() => FileRefDto)
  files?: FileRefDto[];
}

export class SubmitDeliverableDto {
  @ApiPropertyOptional({ type: DeliverableDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeliverableDto)
  deliverable?: DeliverableDto;
}
