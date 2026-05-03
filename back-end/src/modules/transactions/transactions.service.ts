import { Injectable } from '@nestjs/common';
import { SEED_TRANSACTIONS } from '../seed/seed.data';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionsService {
  private transactions: any[] = JSON.parse(JSON.stringify(SEED_TRANSACTIONS));
  private counter = 100;

  private generateId(): string {
    return 'tx_' + Date.now() + '_' + (this.counter++);
  }

  findAll(query?: { userId?: string }) {
    if (query?.userId) {
      return this.transactions.filter(t => t.fromId === query.userId || t.toId === query.userId);
    }
    return this.transactions;
  }

  create(dto: CreateTransactionDto) {
    const tx = {
      id: this.generateId(),
      status: dto.status || 'completed',
      createdAt: new Date().toISOString().slice(0, 10),
      taskId: dto.taskId || null,
      milestoneId: dto.milestoneId || null,
      description: dto.description || '',
      ...dto,
    };
    this.transactions.push(tx);
    return tx;
  }

  resetToSeed() {
    this.transactions = JSON.parse(JSON.stringify(SEED_TRANSACTIONS));
  }
}
