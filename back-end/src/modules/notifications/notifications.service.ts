import { Injectable } from '@nestjs/common';
import { SEED_NOTIFICATIONS } from '../seed/seed.data';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  private notifications: any[] = JSON.parse(JSON.stringify(SEED_NOTIFICATIONS));
  private counter = 100;

  private generateId(): string {
    return 'n_' + Date.now() + '_' + (this.counter++);
  }

  findAll(query?: { userId?: string }) {
    if (query?.userId) return this.notifications.filter(n => n.userId === query.userId);
    return this.notifications;
  }

  create(dto: CreateNotificationDto) {
    const notif = {
      id: this.generateId(),
      read: false,
      createdAt: new Date().toISOString().slice(0, 10),
      subtext: dto.subtext || '',
      ...dto,
    };
    this.notifications.push(notif);
    return notif;
  }

  resetToSeed() {
    this.notifications = JSON.parse(JSON.stringify(SEED_NOTIFICATIONS));
  }
}
