import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { ExpertApplicationsService } from './expert-applications.service';
import { CreateExpertApplicationDto } from './dto/create-expert-application.dto';
import { UpdateExpertApplicationStatusDto } from './dto/update-expert-application.dto';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles';

@ApiTags('Expert Applications')
@Controller('expert-applications')
@UseGuards(RoleGuard)
export class ExpertApplicationsController {
  constructor(private readonly expertApplicationsService: ExpertApplicationsService) {}

  /**
   * Narrow public lookup so the signup form can spot a duplicate application and
   * the login page can explain a pending one. Returns only whether an
   * application exists and its status — never the applicant's details.
   */
  @Get('status')
  @ApiQuery({ name: 'email', required: true })
  @ApiOperation({ summary: 'Check whether an application exists for an email' })
  statusFor(@Query('email') email: string) {
    return this.expertApplicationsService.statusFor(email);
  }

  @Get()
  @ApiHeader({ name: 'role', required: true, description: 'Admin role required' })
  // Applications carry applicants' phone numbers, emails and chosen passwords.
  // This was unguarded, so anyone could read every applicant's details.
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Get all expert applications' })
  findAll() {
    return this.expertApplicationsService.findAll();
  }

  @Get(':id')
  @ApiHeader({ name: 'role', required: true, description: 'Admin role required' })
  @Roles(ROLES.ADMIN)
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
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  // Expert Reviewer intake is the Admin's responsibility, not the SuperUser's.
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Approve or reject expert application (auto-creates user on approval)' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateExpertApplicationStatusDto) {
    return this.expertApplicationsService.updateStatus(id, dto);
  }
}
