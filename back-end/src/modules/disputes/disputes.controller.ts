import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentActor } from '../../common/decorators/actor.decorator';
import type { Actor } from '../../common/decorators/actor.decorator';

@ApiTags('Disputes')
@Controller('disputes')
@UseGuards(RoleGuard)
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all disputes' })
  findAll(@CurrentActor() actor: Actor) {
    return this.disputesService.findAll(actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dispute by ID' })
  findOne(@Param('id') id: string, @CurrentActor() actor: Actor) {
    return this.disputesService.findById(id, actor);
  }

  @Post()
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client', 'worker')
  @ApiOperation({ summary: 'Create a dispute' })
  create(@Body() dto: CreateDisputeDto, @CurrentActor() actor: Actor) {
    return this.disputesService.create(dto, actor);
  }

  @Post(':id/withdraw')
  @Roles('client')
  @ApiOperation({ summary: 'Withdraw your dispute before the reviewer accepts it (any funded fee is returned)' })
  withdraw(@Param('id') id: string, @CurrentActor() actor: Actor) {
    return this.disputesService.withdraw(id, actor);
  }

  @Post(':id/resolve')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('expert', 'superuser')
  @ApiOperation({ summary: 'Resolve a dispute — the assigned reviewer, or operations overriding a stuck case' })
  resolve(@Param('id') id: string, @Body() dto: ResolveDisputeDto, @CurrentActor() actor: Actor) {
    return this.disputesService.resolve(id, dto, actor);
  }
}
