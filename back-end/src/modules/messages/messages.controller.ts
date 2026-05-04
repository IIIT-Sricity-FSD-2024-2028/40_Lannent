import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { RoleGuard } from '../../common/guards/role.guard';

@ApiTags('Messages')
@Controller('messages')
@UseGuards(RoleGuard)
@ApiHeader({ name: 'role', required: false, description: 'User role' })
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  @ApiOperation({ summary: 'Get messages (supports ?taskId= and ?userId= filters)' })
  @ApiQuery({ name: 'taskId', required: false })
  @ApiQuery({ name: 'userId', required: false })
  findAll(@Query('taskId') taskId?: string, @Query('userId') userId?: string) {
    return this.messagesService.findAll({ taskId, userId });
  }

  @Post()
  @ApiOperation({ summary: 'Send a message' })
  create(@Body() dto: CreateMessageDto) {
    return this.messagesService.create(dto);
  }
}
