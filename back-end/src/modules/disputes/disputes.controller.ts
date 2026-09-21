import { Controller, Get, Post, Param, Body, UseGuards , Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Disputes')
@Controller('disputes')
@UseGuards(RoleGuard)
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all disputes' })
  findAll(@Headers('user-id') userId?: string, @Headers('role') role?: string) {
    return this.disputesService.findAll({ id: userId, role });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dispute by ID' })
  findOne(@Param('id') id: string, @Headers('user-id') userId?: string, @Headers('role') role?: string) {
    return this.disputesService.findById(id, { id: userId, role });
  }

  @Post()
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client', 'worker')
  @ApiOperation({ summary: 'Create a dispute' })
  create(@Body() dto: CreateDisputeDto) {
    return this.disputesService.create(dto);
  }

  @Post(':id/resolve')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('expert')
  @ApiOperation({ summary: 'Resolve a dispute (updates milestone status based on verdict)' })
  resolve(@Param('id') id: string, @Body() dto: ResolveDisputeDto) {
    return this.disputesService.resolve(id, dto);
  }
}
