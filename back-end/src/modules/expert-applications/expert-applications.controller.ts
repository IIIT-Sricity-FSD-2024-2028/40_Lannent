import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { ExpertApplicationsService } from './expert-applications.service';
import { CreateExpertApplicationDto } from './dto/create-expert-application.dto';
import { UpdateExpertApplicationStatusDto } from './dto/update-expert-application.dto';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Expert Applications')
@Controller('expert-applications')
@UseGuards(RoleGuard)
@ApiHeader({ name: 'role', required: false, description: 'User role' })
export class ExpertApplicationsController {
  constructor(private readonly expertApplicationsService: ExpertApplicationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all expert applications' })
  findAll() {
    return this.expertApplicationsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get expert application by ID' })
  findOne(@Param('id') id: string) {
    return this.expertApplicationsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Submit an expert application' })
  create(@Body() dto: CreateExpertApplicationDto) {
    return this.expertApplicationsService.create(dto);
  }

  @Patch(':id/status')
  @Roles('superuser')
  @ApiOperation({ summary: 'Approve or reject expert application (auto-creates user on approval)' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateExpertApplicationStatusDto) {
    return this.expertApplicationsService.updateStatus(id, dto);
  }
}
