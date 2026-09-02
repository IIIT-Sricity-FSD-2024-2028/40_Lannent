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
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMilestoneDto extends PartialType(CreateMilestoneDto) {
  @ApiPropertyOptional({ example: 'in-progress', enum: ['pending', 'in-progress', 'submitted', 'review', 'completed', 'approved', 'disputed', 'audit-passed', 'revision-needed'] })
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional() @IsNumber()
  progress?: number;
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

  @ApiPropertyOptional({ example: 'https://github.com/example/mobile-app' })
  @IsOptional() @IsUrl({ require_tld: false }, { message: 'link must be a valid URL' })
  @MaxLength(2000)
  link?: string;

  /**
   * Filenames today. The file-upload stage replaces these with real file
   * references; until then this stays `string[]` so submissions already in
   * flight keep validating.
   */
  @ApiPropertyOptional({ example: ['design-system.fig', 'screens.pdf'], type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true }) @MaxLength(255, { each: true })
  files?: string[];
}

export class SubmitDeliverableDto {
  @ApiPropertyOptional({ type: DeliverableDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeliverableDto)
  deliverable?: DeliverableDto;
}
