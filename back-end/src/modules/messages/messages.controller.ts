import { Controller, Get, Post, Body, Query, UseGuards, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { RoleGuard } from '../../common/guards/role.guard';
import { CurrentActor } from '../../common/decorators/actor.decorator';
import type { Actor } from '../../common/decorators/actor.decorator';
import { ContactsService } from '../contacts/contacts.service';
import { UsersService } from '../users/users.service';
import { FilesService } from '../files/files.service';

@ApiTags('Messages')
@Controller('messages')
@UseGuards(RoleGuard)
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    @Inject(forwardRef(() => ContactsService)) private readonly contacts: ContactsService,
    @Inject(forwardRef(() => UsersService)) private readonly users: UsersService,
    @Inject(forwardRef(() => NotificationsService)) private readonly notifications: NotificationsService,
    @Inject(forwardRef(() => FilesService)) private readonly files: FilesService,
  ) {}

  /** Conversations you are in. This returned every message on the platform to any caller. */
  @Get()
  @ApiOperation({ summary: 'Get your messages (supports ?taskId=)' })
  @ApiQuery({ name: 'taskId', required: false })
  findAll(@CurrentActor() actor: Actor, @Query('taskId') taskId?: string) {
    return this.messagesService.findAll({ taskId, userId: actor.id });
  }

  @Post()
  @ApiOperation({ summary: 'Send a message within a project' })
  create(@Body() dto: CreateMessageDto, @CurrentActor() actor: Actor) {
    // Sent as the caller, to someone on the same project. `senderId` and the
    // display name were taken from the body, so a message could be forged in
    // anyone's name to anyone.
    if (!this.contacts.isParticipant(actor.id, dto.taskId) || !this.contacts.isParticipant(dto.receiverId, dto.taskId)) {
      throw new ForbiddenException('Messages can only be sent between people on the same project.');
    }
    const content = (dto.content || '').trim();
    if (!content && !dto.attachment) throw new BadRequestException('Write a message or attach a file.');
    if (dto.receiverId === actor.id) throw new BadRequestException('You cannot message yourself.');
    const sender = this.users.findById(actor.id);
    // The link is rebuilt from the file id, never taken from the body, so a
    // message cannot carry an arbitrary URL dressed up as an attachment.
    const a = dto.attachment;
    if (a && !a.id) throw new BadRequestException('Upload the file before attaching it.');
    if (a) {
      // Only a file uploaded to this project, by the sender — not an id
      // lifted from somewhere else.
      const f = this.files.findRecord(a.id!);
      if (!f || f.taskId !== dto.taskId || f.uploadedBy !== actor.id) {
        throw new BadRequestException('Attach a file you uploaded to this project.');
      }
    }
    const stored = a ? this.files.findRecord(a.id!) : null;
    const attachment = stored ? { id: stored.id, name: stored.name, size: stored.size, mime: stored.mime, url: `/api/files/${stored.id}` } : null;
    const msg = this.messagesService.create({
      ...dto,
      content,
      attachment,
      senderId: actor.id,
      senderName: sender.name,
      senderAvatar: sender.avatar,
      senderAvatarColor: sender.avatarColor,
      senderRole: sender.role,
    } as any);
    this.notifications.notify(dto.receiverId, {
      type: 'message',
      text: `New message from ${sender.name}`,
      subtext: content ? (content.length > 60 ? content.slice(0, 60) + '…' : content) : `📎 ${dto.attachment?.name || 'File'}`,
      link: `/messages?taskId=${dto.taskId}&with=${actor.id}`,
    });
    return msg;
  }
}
