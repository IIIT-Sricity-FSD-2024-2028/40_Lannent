import { Controller, Get, Post, Patch, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { RoleGuard } from '../../common/guards/role.guard';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(RoleGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications (supports ?userId= filter)' })
  @ApiQuery({ name: 'userId', required: false })
  findAll(@Query('userId') userId?: string) {
    return this.notificationsService.findAll({ userId });
  }

  @Post()
  @ApiOperation({ summary: 'Create a notification' })
  create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(dto);
  }

  @Patch(':userId/read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for a user' })
  markAllRead(@Param('userId') userId: string) {
    return this.notificationsService.markAllRead(userId);
  }
}
