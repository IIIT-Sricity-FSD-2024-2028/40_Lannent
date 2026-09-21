import { ForbiddenException, Controller, Get, Post, Patch, Delete, Param, Body, Headers, Query, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from './users.service';
import { LedgerService } from '../ledger/ledger.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login.dto';
import { WalletDto } from './dto/wallet.dto';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { canMoveAnyWallet } from '../../common/guards/viewer.util';

@ApiTags('Users')
@Controller('users')
@UseGuards(RoleGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => LedgerService)) private readonly ledger: LedgerService,
  ) {}

  @Post('login')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Login with email and password' })
  login(@Body() dto: LoginDto) {
    const { user, session } = this.usersService.login(dto.email, dto.password);
    return { user: redact(user), session };
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiQuery({ name: 'role', required: false, description: 'Filter by role (client, worker, expert, superuser)' })
  findAll(@Query('role') role?: string) {
    const all = this.usersService.findAll();
    return redact(role ? all.filter(u => u.role === role) : all);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id') id: string) {
    return redact(this.usersService.findById(id));
  }

  @Post('staff')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('superuser')
  @ApiOperation({ summary: 'Create any user type including staff/admin (superuser only)' })
  createStaff(@Body() dto: CreateUserDto) {
    return redact(this.usersService.createPrivileged(dto));
  }

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Register a new user' })
  create(@Body() dto: CreateUserDto) {
    return redact(this.usersService.create(dto));
  }

  @Patch(':id')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client', 'worker', 'expert', 'superuser')
  @ApiOperation({ summary: 'Update user profile' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return redact(this.usersService.update(id, dto));
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
  addToWallet(@Param('id') id: string, @Body() dto: WalletDto, @Headers('user-id') actor: string, @Headers('role') role: string) {
    assertOwnWallet(id, actor, role);
    return this.ledger.deposit(id, dto.amount);
  }

  @Post(':id/wallet/deduct')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  // Workers and experts debit their own wallet when withdrawing.
  @Roles('client', 'worker', 'expert', 'superuser')
  @ApiOperation({ summary: 'Deduct funds from a wallet (no fee — internal transfer)' })
  deductFromWallet(@Param('id') id: string, @Body() dto: WalletDto, @Headers('user-id') actor: string, @Headers('role') role: string) {
    assertOwnWallet(id, actor, role);
    return redact(this.usersService.deductFromWallet(id, dto.amount));
  }

  @Post(':id/wallet/withdraw')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client', 'worker', 'expert', 'superuser')
  @ApiOperation({
    summary: 'Withdraw to an external account (payout fee applies)',
    description: 'Debits the full gross amount and returns the fee breakdown and net paid out.',
  })
  withdraw(@Param('id') id: string, @Body() dto: WalletDto, @Headers('user-id') actor: string, @Headers('role') role: string) {
    assertOwnWallet(id, actor, role);
    return this.ledger.withdraw(id, dto.amount);
  }
}

/**
 * Strips the password on the way out.
 *
 * `GET /api/users` was returning all eleven records with the plaintext
 * password to any caller with any role header. Redacting here rather than in
 * the service is deliberate: internal callers hold the raw record and mutate
 * it, so handing them a copy would silently drop their writes.
 */
function redact<T>(value: T): T {
  if (Array.isArray(value)) return value.map(v => redact(v)) as unknown as T;
  if (value && typeof value === 'object') {
    const { password, ...safe } = value as any;
    return safe as T;
  }
  return value;
}

/**
 * A wallet belongs to one person.
 *
 * These three routes took the user id from the **URL** and never compared it
 * to the caller. `@Roles` checked that the caller had *a* role, not that the
 * wallet was theirs — so any signed-in worker could withdraw from anyone's
 * balance. Proven before this check existed: u2 withdrew $250 from u5.
 *
 * Authentication alone does not close this: a valid token for u2 still names
 * u5 in the path. The comparison has to happen here.
 */
function assertOwnWallet(walletUserId: string, actorId?: string, role?: string) {
  if (canMoveAnyWallet(role)) return;
  if (!actorId) {
    throw new ForbiddenException('Missing "user-id" header. A wallet operation must identify the account holder.');
  }
  if (actorId !== walletUserId) {
    throw new ForbiddenException('You can only move money in and out of your own wallet.');
  }
}
