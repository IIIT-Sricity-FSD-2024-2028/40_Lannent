import { Controller, Get, Post, Patch, Delete, Param, Body, Headers, Query, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { LedgerService } from '../ledger/ledger.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login.dto';
import { WalletDto } from './dto/wallet.dto';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Users')
@Controller('users')
@UseGuards(RoleGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => LedgerService)) private readonly ledger: LedgerService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  login(@Body() dto: LoginDto) {
    return this.usersService.login(dto.email, dto.password);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiQuery({ name: 'role', required: false, description: 'Filter by role (client, worker, expert, superuser)' })
  findAll(@Query('role') role?: string) {
    if (role) return this.usersService.findAll().filter(u => u.role === role);
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Register a new user' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client', 'worker', 'expert', 'superuser')
  @ApiOperation({ summary: 'Update user profile' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('superuser')
  @ApiOperation({ summary: 'Delete a user (superuser only)' })
  remove(@Param('id') id: string) {
    return this.usersService.delete(id);
  }

  @Post(':id/wallet/add')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client', 'worker', 'expert', 'superuser')
  @ApiOperation({
    summary: 'Deposit funds into a wallet (card processing fee applies)',
    description: 'Charges the deposit processing fee and credits the net. Returns the fee breakdown.',
  })
  addToWallet(@Param('id') id: string, @Body() dto: WalletDto) {
    return this.ledger.deposit(id, dto.amount);
  }

  @Post(':id/wallet/deduct')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  // Workers and experts debit their own wallet when withdrawing.
  @Roles('client', 'worker', 'expert', 'superuser')
  @ApiOperation({ summary: 'Deduct funds from a wallet (no fee — internal transfer)' })
  deductFromWallet(@Param('id') id: string, @Body() dto: WalletDto) {
    return this.usersService.deductFromWallet(id, dto.amount);
  }

  @Post(':id/wallet/withdraw')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client', 'worker', 'expert', 'superuser')
  @ApiOperation({
    summary: 'Withdraw to an external account (payout fee applies)',
    description: 'Debits the full gross amount and returns the fee breakdown and net paid out.',
  })
  withdraw(@Param('id') id: string, @Body() dto: WalletDto) {
    return this.ledger.withdraw(id, dto.amount);
  }
}
