import { Injectable } from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessagesRepository } from './messages.repository';

/**
 * MessagesService — Business Logic Layer
 *
 * Delegates all data-access operations to MessagesRepository.
 */
@Injectable()
export class MessagesService {
  constructor(private readonly messagesRepository: MessagesRepository) {}

  findAll(query?: { taskId?: string; userId?: string }) {
    return this.messagesRepository.findAll(query);
  }

  create(dto: CreateMessageDto) {
    const msg = {
      id: this.messagesRepository.generateId(),
      createdAt: new Date().toISOString(),
      ...dto,
    };
    return this.messagesRepository.insert(msg);
  }

  resetToSeed() {
    this.messagesRepository.resetToSeed();
  }
}
