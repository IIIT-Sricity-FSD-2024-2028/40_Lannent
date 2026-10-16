import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { ProposalsService } from './proposals.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentActor } from '../../common/decorators/actor.decorator';
import type { Actor } from '../../common/decorators/actor.decorator';

@ApiTags('Proposals')
@Controller('proposals')
@UseGuards(RoleGuard)
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Get()
  @ApiOperation({ summary: 'Applications and invitations you sent or received (supports ?taskId=&workerId=&type= filters)' })
  @ApiQuery({ name: 'taskId', required: false })
  @ApiQuery({ name: 'workerId', required: false })
  @ApiQuery({ name: 'type', required: false, enum: ['application', 'invitation'] })
  findAll(
    @Query('taskId') taskId?: string,
    @Query('workerId') workerId?: string,
    @Query('type') type?: string,
    @CurrentActor() actor?: Actor,
  ) {
    return this.proposalsService.findAll({ taskId, workerId, type }, actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an application or invitation by ID' })
  findOne(@Param('id') id: string, @CurrentActor() actor: Actor) {
    return this.proposalsService.findById(id, actor);
  }

  @Post()
  @Roles('worker', 'client')
  @ApiOperation({ summary: 'A worker applies to an open project, or a client invites a worker — always at the posted budget' })
  create(@Body() dto: CreateProposalDto, @CurrentActor() actor: Actor) {
    return this.proposalsService.create(dto, actor);
  }

  @Patch(':id')
  @Roles('worker', 'client')
  @ApiOperation({ summary: 'Withdraw your own pending application or invitation' })
  update(@Param('id') id: string, @Body() dto: UpdateProposalDto, @CurrentActor() actor: Actor) {
    return this.proposalsService.update(id, dto, actor);
  }

  @Post(':id/accept')
  @Roles('worker', 'client')
  @ApiOperation({ summary: 'The client accepts an application, or the invited worker accepts an invitation — the worker is hired at the posted budget' })
  accept(@Param('id') id: string, @CurrentActor() actor: Actor) {
    return this.proposalsService.accept(id, actor);
  }

  @Post(':id/decline')
  @Roles('worker', 'client')
  @ApiOperation({ summary: 'The client rejects an application, or the invited worker declines an invitation' })
  decline(@Param('id') id: string, @CurrentActor() actor: Actor) {
    return this.proposalsService.decline(id, actor);
  }
}
