import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsNumber, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * `role` and `email` are deliberately not updatable here.
 *
 * This extended `PartialType(CreateUserDto)`, which inherits `role` — so any
 * signed-in user could `PATCH /users/:id { "role": "admin" }` and promote
 * themselves. Identity fields move through their own guarded endpoints.
 */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['role', 'email', 'password'] as const),
) {
  @ApiPropertyOptional({ example: 'active', enum: ['active', 'suspended'] })
  @IsOptional() @IsIn(['active', 'suspended'])
  status?: string;

  @ApiPropertyOptional({ example: 10000 })
  @IsOptional() @IsNumber()
  walletBalance?: number;

  @ApiPropertyOptional({ example: 4.8 })
  @IsOptional() @IsNumber()
  rating?: number;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional() @IsNumber()
  completedProjects?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional() @IsNumber()
  reviewsDone?: number;
}
