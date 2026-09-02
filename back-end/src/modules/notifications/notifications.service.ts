import { Injectable } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsRepository } from './notifications.repository';

/**
 * NotificationsService — Business Logic Layer
 *
 * Delegates all data-access operations to NotificationsRepository.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly notificationsRepository: NotificationsRepository) {}

  findAll(query?: { userId?: string }) {
    return this.notificationsRepository.findAll(query);
  }

  create(dto: CreateNotificationDto) {
    const notif = {
      id: this.notificationsRepository.generateId(),
      read: false,
      createdAt: new Date().toISOString().slice(0, 10),
      subtext: dto.subtext || '',
      ...dto,
    };
    return this.notificationsRepository.insert(notif);
  }

  markAllRead(userId: string) {
    const count = this.notificationsRepository.markAllReadByUserId(userId);
    return { markedRead: count };
  }

  resetToSeed() {
    this.notificationsRepository.resetToSeed();
  }
}
