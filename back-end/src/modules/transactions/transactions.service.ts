import { Injectable } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionsRepository } from './transactions.repository';

/**
 * TransactionsService — Business Logic Layer
 *
 * Delegates all data-access operations to TransactionsRepository.
 */
@Injectable()
export class TransactionsService {
  constructor(private readonly transactionsRepository: TransactionsRepository) {}

  findAll(query?: { userId?: string }) {
    return this.transactionsRepository.findAll(query);
  }

  create(dto: CreateTransactionDto) {
    const tx = {
      id: this.transactionsRepository.generateId(),
      status: dto.status || 'completed',
      createdAt: new Date().toISOString().slice(0, 10),
      taskId: dto.taskId || null,
      milestoneId: dto.milestoneId || null,
      description: dto.description || '',
      ...dto,
    };
    return this.transactionsRepository.insert(tx);
  }

  resetToSeed() {
    this.transactionsRepository.resetToSeed();
  }
}
