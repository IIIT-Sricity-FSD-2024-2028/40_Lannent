import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { AuditRequestsService } from './audit-requests.service';
import { CreateAuditRequestDto } from './dto/create-audit-request.dto';
import { UpdateAuditRequestDto } from './dto/update-audit-request.dto';
import { CreateOfferDto, AcceptAuditDto, DeclineAuditDto, ReassignAuditDto } from './dto/audit-offer.dto';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentActor } from '../../common/decorators/actor.decorator';
import type { Actor } from '../../common/decorators/actor.decorator';

@ApiTags('Audit Requests')
@Controller('audit-requests')
@UseGuards(RoleGuard)
export class AuditRequestsController {
  constructor(private readonly auditRequestsService: AuditRequestsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all audit requests (supports ?expertId=&status=&taskId=&kind=)' })
  @ApiQuery({ name: 'expertId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'taskId', required: false })
  @ApiQuery({ name: 'kind', required: false })
  findAll(
    @Query('expertId') expertId?: string,
    @Query('status') status?: string,
    @Query('taskId') taskId?: string,
    @Query('kind') kind?: string,
    @CurrentActor() actor?: Actor,
  ) {
    return this.auditRequestsService.findAll({ expertId, status, taskId, kind }, actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit request by ID' })
  findOne(@Param('id') id: string, @CurrentActor() actor: Actor) {
    return this.auditRequestsService.findById(id, actor);
  }

  @Get(':id/preview')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('expert', 'client', 'worker', 'superuser', 'compliance-admin')
  @ApiOperation({
    summary: 'Preview the work before accepting',
    description: 'Project, milestones, client, worker and — for a dispute audit — the claim itself.',
  })
  preview(@Param('id') id: string, @CurrentActor() actor: Actor) {
    return this.auditRequestsService.preview(id, actor);
  }

  @Post()
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client')
  @ApiOperation({ summary: 'Create an audit request' })
  create(@Body() dto: CreateAuditRequestDto, @CurrentActor() actor: Actor) {
    return this.auditRequestsService.createForClient(dto, actor);
  }

  @Post(':id/reassign')
  @Roles('client')
  @ApiOperation({ summary: 'After a decline, ask a different reviewer' })
  reassign(@Param('id') id: string, @Body() dto: ReassignAuditDto, @CurrentActor() actor: Actor) {
    return this.auditRequestsService.reassign(id, dto, actor);
  }

  @Post(':id/cancel')
  @Roles('client')
  @ApiOperation({ summary: 'Withdraw a request the reviewer has not accepted yet (any funded fee is returned)' })
  cancel(@Param('id') id: string, @CurrentActor() actor: Actor) {
    return this.auditRequestsService.cancelByPayer(id, actor);
  }

  @Post(':id/offers')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client', 'expert')
  @ApiOperation({ summary: 'Make or counter an offer for the audit fee' })
  addOffer(@Param('id') id: string, @Body() dto: CreateOfferDto, @CurrentActor() actor: Actor) {
    return this.auditRequestsService.addOffer(id, dto, actor);
  }

  @Post(':id/offers/:offerId/accept')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client', 'expert')
  @ApiOperation({ summary: 'Accept an outstanding offer, fixing the agreed fee' })
  acceptOffer(@Param('id') id: string, @Param('offerId') offerId: string, @CurrentActor() actor: Actor) {
    return this.auditRequestsService.acceptOffer(id, offerId, actor);
  }

  @Post(':id/fund')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client')
  @ApiOperation({ summary: 'Move the agreed fee into escrow' })
  fund(@Param('id') id: string, @CurrentActor() actor: Actor) {
    return this.auditRequestsService.fund(id, actor);
  }

  @Post(':id/accept')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('expert')
  @ApiOperation({
    summary: 'Expert takes the engagement',
    description: 'For a project audit this also releases the project from draft.',
  })
  accept(@Param('id') id: string, @Body() dto: AcceptAuditDto, @CurrentActor() actor: Actor) {
    return this.auditRequestsService.accept(id, dto, actor);
  }

  @Post(':id/decline')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('expert')
  @ApiOperation({ summary: 'Expert passes on the engagement' })
  decline(@Param('id') id: string, @Body() dto: DeclineAuditDto, @CurrentActor() actor: Actor) {
    return this.auditRequestsService.decline(id, dto, actor);
  }

  @Patch(':id')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  // Previously unguarded: any caller with no role header at all could mutate an audit.
  @Roles('client', 'worker', 'expert')
  @ApiOperation({ summary: 'Update audit request fields' })
  update(@Param('id') id: string, @Body() dto: UpdateAuditRequestDto, @CurrentActor() actor: Actor) {
    return this.auditRequestsService.update(id, dto, actor);
  }
}
