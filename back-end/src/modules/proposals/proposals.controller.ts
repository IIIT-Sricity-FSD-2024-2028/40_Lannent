import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { ProposalsService } from './proposals.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { UpdateProposalDto } from './dto/update-proposal.dto';
import { RoleGuard } from '../../common/guards/role.guard';

@ApiTags('Proposals')
@Controller('proposals')
@UseGuards(RoleGuard)
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all proposals (supports ?taskId=&workerId=&type= filters)' })
  @ApiQuery({ name: 'taskId', required: false })
  @ApiQuery({ name: 'workerId', required: false })
  @ApiQuery({ name: 'type', required: false, enum: ['proposal', 'invitation'] })
  findAll(
    @Query('taskId') taskId?: string,
    @Query('workerId') workerId?: string,
    @Query('type') type?: string,
  ) {
    return this.proposalsService.findAll({ taskId, workerId, type });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get proposal by ID' })
  findOne(@Param('id') id: string) {
    return this.proposalsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new proposal or invitation' })
  create(@Body() dto: CreateProposalDto) {
    return this.proposalsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a proposal' })
  update(@Param('id') id: string, @Body() dto: UpdateProposalDto) {
    return this.proposalsService.update(id, dto);
  }

  @Post(':id/hire')
  @ApiOperation({ summary: 'Hire worker (rejects other proposals, locks escrow)' })
  hire(@Param('id') id: string) {
    return this.proposalsService.hireWorker(id);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept an invitation' })
  accept(@Param('id') id: string) {
    return this.proposalsService.acceptInvitation(id);
  }

  @Post(':id/decline')
  @ApiOperation({ summary: 'Decline an invitation' })
  decline(@Param('id') id: string) {
    return this.proposalsService.declineInvitation(id);
  }
}
