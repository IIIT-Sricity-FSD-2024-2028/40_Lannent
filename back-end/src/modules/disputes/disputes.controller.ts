import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Disputes')
@Controller('disputes')
@UseGuards(RoleGuard)
@ApiHeader({ name: 'role', required: false, description: 'User role' })
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all disputes' })
  findAll() {
    return this.disputesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dispute by ID' })
  findOne(@Param('id') id: string) {
    return this.disputesService.findById(id);
  }

  @Post()
  @Roles('client', 'worker')
  @ApiOperation({ summary: 'Create a dispute' })
  create(@Body() dto: CreateDisputeDto) {
    return this.disputesService.create(dto);
  }

  @Post(':id/resolve')
  @Roles('expert', 'superuser')
  @ApiOperation({ summary: 'Resolve a dispute (updates milestone status based on verdict)' })
  resolve(@Param('id') id: string, @Body() dto: ResolveDisputeDto) {
    return this.disputesService.resolve(id, dto);
  }
}
