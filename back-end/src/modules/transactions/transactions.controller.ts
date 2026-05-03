import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Transactions')
@Controller('transactions')
@UseGuards(RoleGuard)
@ApiHeader({ name: 'role', required: false, description: 'User role' })
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all transactions (supports ?userId= filter)' })
  @ApiQuery({ name: 'userId', required: false })
  findAll(@Query('userId') userId?: string) {
    return this.transactionsService.findAll({ userId });
  }

  @Post()
  @Roles('client', 'superuser')
  @ApiOperation({ summary: 'Create a transaction' })
  create(@Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(dto);
  }
}
