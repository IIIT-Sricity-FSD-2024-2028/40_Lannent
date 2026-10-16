import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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

  create(dto: CreateNotificationDto & { fromUserId?: string }) {
    const notif = {
      ...dto,
      id: this.notificationsRepository.generateId(),
      read: false,
      // Full timestamp: a day alone cannot order a busy afternoon's events.
      createdAt: new Date().toISOString(),
      subtext: dto.subtext || '',
      link: dto.link || null,
    };
    return this.notificationsRepository.insert(notif);
  }

  /**
   * Platform-generated notification. Never throws: a notice that cannot be
   * written must not undo the action it describes.
   */
  notify(userId: string | null | undefined, n: { type: string; text: string; subtext?: string; link?: string }) {
    if (!userId) return null;
    try {
      return this.create({ userId, ...n } as any);
    } catch {
      return null;
    }
  }

  markRead(id: string, userId: string) {
    const n = this.notificationsRepository.findById(id);
    if (!n) throw new NotFoundException('Notification not found.');
    if (n.userId !== userId) throw new ForbiddenException('You can only mark your own notifications as read.');
    n.read = true;
    return n;
  }

  markAllRead(userId: string) {
    const count = this.notificationsRepository.markAllReadByUserId(userId);
    return { markedRead: count };
  }

  resetToSeed() {
    this.notificationsRepository.resetToSeed();
  }
}
