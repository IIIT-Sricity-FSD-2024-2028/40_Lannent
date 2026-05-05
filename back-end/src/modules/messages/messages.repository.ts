import { Injectable } from '@nestjs/common';

/**
 * MessagesRepository — In-Memory Data Access Layer
 *
 * Manages the MESSAGES array and provides low-level CRUD operations.
 * Messages start empty (no seed data) and are created at runtime.
 */
@Injectable()
export class MessagesRepository {
  private messages: any[] = [];
  private counter = 100;

  generateId(): string {
    return 'msg_' + Date.now() + '_' + (this.counter++);
  }

  findAll(query?: { taskId?: string; userId?: string }): any[] {
    let result = this.messages;
    if (query?.taskId) result = result.filter(m => m.taskId === query.taskId);
    if (query?.userId) result = result.filter(m => m.senderId === query.userId || m.receiverId === query.userId);
    return result;
  }

  insert(message: any): any {
    this.messages.push(message);
    return message;
  }

  resetToSeed(): void {
    this.messages = [];
  }
}
