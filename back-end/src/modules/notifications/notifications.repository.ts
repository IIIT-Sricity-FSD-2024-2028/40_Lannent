import { Injectable } from '@nestjs/common';
import { SEED_NOTIFICATIONS } from '../seed/seed.data';

/**
 * NotificationsRepository — In-Memory Data Access Layer
 *
 * Manages the NOTIFICATIONS array and provides low-level CRUD operations.
 * Business logic belongs in NotificationsService.
 */
@Injectable()
export class NotificationsRepository {
  private notifications: any[] = JSON.parse(JSON.stringify(SEED_NOTIFICATIONS));
  private counter = 100;

  generateId(): string {
    return 'n_' + Date.now() + '_' + (this.counter++);
  }

  findAll(query?: { userId?: string }): any[] {
    if (query?.userId) return this.notifications.filter(n => n.userId === query.userId);
    return this.notifications;
  }

  insert(notification: any): any {
    this.notifications.push(notification);
    return notification;
  }

  markAllReadByUserId(userId: string): number {
    let count = 0;
    this.notifications.forEach(n => {
      if (n.userId === userId && !n.read) {
        n.read = true;
        count++;
      }
    });
    return count;
  }

  resetToSeed(): void {
    this.notifications = JSON.parse(JSON.stringify(SEED_NOTIFICATIONS));
  }
}
