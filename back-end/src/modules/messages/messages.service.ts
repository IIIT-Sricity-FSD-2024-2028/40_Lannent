import { Injectable } from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessagesService {
  private messages: any[] = [];
  private counter = 100;

  private generateId(): string {
    return 'msg_' + Date.now() + '_' + (this.counter++);
  }

  findAll(query?: { taskId?: string; userId?: string }) {
    let result = this.messages;
    if (query?.taskId) result = result.filter(m => m.taskId === query.taskId);
    if (query?.userId) result = result.filter(m => m.senderId === query.userId || m.receiverId === query.userId);
    return result;
  }

  create(dto: CreateMessageDto) {
    const msg = {
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      ...dto,
    };
    this.messages.push(msg);
    return msg;
  }

  resetToSeed() {
    this.messages = [];
  }
}
