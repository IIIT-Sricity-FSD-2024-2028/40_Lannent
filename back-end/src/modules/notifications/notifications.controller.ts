import { Controller, Get, Patch, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { RoleGuard } from '../../common/guards/role.guard';
import { CurrentActor } from '../../common/decorators/actor.decorator';
import type { Actor } from '../../common/decorators/actor.decorator';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(RoleGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /** Your own notifications. `?userId=` used to return anyone's — or, omitted, everyone's. */
  @Get()
  @ApiOperation({ summary: 'Get your notifications' })
  findAll(@CurrentActor() actor: Actor) {
    return this.notificationsService.findAll({ userId: actor.id });
  }

  // POST /notifications was removed. It let any signed-in user who could see a client's
  // project put any text — "Your account is locked, message me to unlock it"
  // — into that client's notifications, styled as a payment or a dispute.
  // Every notification is now written by the platform itself, about
  // something that actually happened.

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one of your notifications as read' })
  markRead(@Param('id') id: string, @CurrentActor() actor: Actor) {
    return this.notificationsService.markRead(id, actor.id);
  }

  @Patch(':userId/read-all')
  @ApiOperation({ summary: 'Mark all your notifications as read' })
  markAllRead(@Param('userId') userId: string, @CurrentActor() actor: Actor) {
    if (userId !== actor.id) throw new ForbiddenException('You can only mark your own notifications as read.');
    return this.notificationsService.markAllRead(userId);
  }
}
