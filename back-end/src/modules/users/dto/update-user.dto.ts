import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsNumber, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(CreateUserDto) {
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
