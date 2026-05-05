import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { AuditRequestsService } from './audit-requests.service';
import { CreateAuditRequestDto } from './dto/create-audit-request.dto';
import { UpdateAuditRequestDto } from './dto/update-audit-request.dto';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Audit Requests')
@Controller('audit-requests')
@UseGuards(RoleGuard)
export class AuditRequestsController {
  constructor(private readonly auditRequestsService: AuditRequestsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all audit requests (supports ?expertId=&status= filters)' })
  @ApiQuery({ name: 'expertId', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(@Query('expertId') expertId?: string, @Query('status') status?: string) {
    return this.auditRequestsService.findAll({ expertId, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit request by ID' })
  findOne(@Param('id') id: string) {
    return this.auditRequestsService.findById(id);
  }

  @Post()
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client', 'superuser')
  @ApiOperation({ summary: 'Create an audit request' })
  create(@Body() dto: CreateAuditRequestDto) {
    return this.auditRequestsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update audit request status' })
  update(@Param('id') id: string, @Body() dto: UpdateAuditRequestDto) {
    return this.auditRequestsService.update(id, dto);
  }
}
