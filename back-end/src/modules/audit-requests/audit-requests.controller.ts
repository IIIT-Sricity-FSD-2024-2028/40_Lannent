import { Controller, Get, Post, Patch, Param, Body, Query, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { AuditRequestsService } from './audit-requests.service';
import { CreateAuditRequestDto } from './dto/create-audit-request.dto';
import { UpdateAuditRequestDto } from './dto/update-audit-request.dto';
import { CreateOfferDto, AcceptAuditDto, DeclineAuditDto } from './dto/audit-offer.dto';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';

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
  ) {
    return this.auditRequestsService.findAll({ expertId, status, taskId, kind });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit request by ID' })
  findOne(@Param('id') id: string) {
    return this.auditRequestsService.findById(id);
  }

  @Get(':id/preview')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('expert', 'client', 'superuser')
  @ApiOperation({
    summary: 'Preview the work before accepting',
    description: 'Project, milestones, client, worker and — for a dispute audit — the claim itself.',
  })
  preview(@Param('id') id: string) {
    return this.auditRequestsService.preview(id);
  }

  @Post()
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client', 'superuser')
  @ApiOperation({ summary: 'Create an audit request' })
  create(@Body() dto: CreateAuditRequestDto) {
    return this.auditRequestsService.create(dto);
  }

  @Post(':id/offers')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client', 'expert', 'superuser')
  @ApiOperation({ summary: 'Make or counter an offer for the audit fee' })
  addOffer(@Param('id') id: string, @Body() dto: CreateOfferDto) {
    return this.auditRequestsService.addOffer(id, dto);
  }

  @Post(':id/offers/:offerId/accept')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client', 'expert', 'superuser')
  @ApiOperation({ summary: 'Accept an outstanding offer, fixing the agreed fee' })
  acceptOffer(@Param('id') id: string, @Param('offerId') offerId: string, @Headers('role') role: string) {
    return this.auditRequestsService.acceptOffer(id, offerId, role);
  }

  @Post(':id/fund')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client', 'superuser')
  @ApiOperation({ summary: 'Move the agreed fee into escrow' })
  fund(@Param('id') id: string) {
    return this.auditRequestsService.fund(id);
  }

  @Post(':id/accept')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('expert', 'superuser')
  @ApiOperation({
    summary: 'Expert takes the engagement',
    description: 'For a project audit this also releases the project from draft.',
  })
  accept(@Param('id') id: string, @Body() dto: AcceptAuditDto) {
    return this.auditRequestsService.accept(id, dto);
  }

  @Post(':id/decline')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('expert', 'superuser')
  @ApiOperation({ summary: 'Expert passes on the engagement' })
  decline(@Param('id') id: string, @Body() dto: DeclineAuditDto) {
    return this.auditRequestsService.decline(id, dto);
  }

  @Patch(':id')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  // Previously unguarded: any caller with no role header at all could mutate an audit.
  @Roles('client', 'expert', 'superuser')
  @ApiOperation({ summary: 'Update audit request fields' })
  update(@Param('id') id: string, @Body() dto: UpdateAuditRequestDto) {
    return this.auditRequestsService.update(id, dto);
  }
}
