import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { SeedService } from './seed.service';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Seed')
@Controller('seed')
@UseGuards(RoleGuard)
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post('reset')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('superuser')
  @ApiOperation({ summary: 'Reset all data to seed state (superuser only)' })
  reset() {
    this.seedService.resetAll();
    return { message: 'All data has been reset to seed state.' };
  }
}
