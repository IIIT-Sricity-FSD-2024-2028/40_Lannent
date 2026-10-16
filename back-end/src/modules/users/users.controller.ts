import { ForbiddenException, BadRequestException, Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from './users.service';
import { LedgerService } from '../ledger/ledger.service';
import { TasksService } from '../tasks/tasks.service';
import { AuditRequestsService } from '../audit-requests/audit-requests.service';
import { ProposalsService } from '../proposals/proposals.service';
import { AuthService } from '../auth/auth.service';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, ChangePasswordDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login.dto';
import { WalletDto } from './dto/wallet.dto';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { canMoveAnyWallet, canViewAnyRecord } from '../../common/guards/viewer.util';
import { CurrentActor } from '../../common/decorators/actor.decorator';
import type { Actor } from '../../common/decorators/actor.decorator';
import { ALL_ROLES, ROLES } from '../../common/constants/roles';

@ApiTags('Users')
@Controller('users')
@UseGuards(RoleGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => LedgerService)) private readonly ledger: LedgerService,
    @Inject(forwardRef(() => TasksService)) private readonly tasks: TasksService,
    @Inject(forwardRef(() => AuditRequestsService)) private readonly auditRequests: AuditRequestsService,
    @Inject(forwardRef(() => ProposalsService)) private readonly proposals: ProposalsService,
    @Inject(forwardRef(() => AuthService)) private readonly auth: AuthService,
    private readonly audit: AuditService,
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
  findAll(@CurrentActor() actor: Actor, @Query('role') role?: string) {
    const all = this.usersService.findAll();
    return (role ? all.filter(u => u.role === role) : all).map(u => viewFor(u, actor));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id') id: string, @CurrentActor() actor: Actor) {
    return viewFor(this.usersService.findById(id), actor);
  }

  @Post('staff')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('superuser')
  @ApiOperation({ summary: 'Create a client, worker or admin-desk account (superuser only)' })
  createStaff(@Body() dto: CreateUserDto, @CurrentActor() actor: Actor) {
    // Expert Reviewers join through the intake desk's application review,
    // which records the domains they cover and checks their résumé.
    if (dto.role === 'expert') {
      throw new BadRequestException('Expert Reviewers are added by approving their application on the intake desk.');
    }
    // A superuser cannot be suspended or deleted by another superuser, so a
    // second one created here could never be removed again.
    if (dto.role === ROLES.SUPERUSER) {
      throw new ForbiddenException('Operations accounts are created by seeding, not from the app.');
    }
    // The creator chose this password, so they know it. The new owner must
    // replace it before the account can do anything, and the creation is on
    // the compliance trail with the creator's name against it.
    const created = this.usersService.createPrivileged(dto, undefined, {
      createdBy: actor.id,
      mustChangePassword: true,
    });
    this.audit.record({
      kind: 'account.create',
      outcome: 'ok',
      detail: { userId: created.id, email: created.email, role: created.role, createdBy: actor.id },
    });
    return redact(created);
  }

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Register a new user' })
  create(@Body() dto: CreateUserDto) {
    return redact(this.usersService.create(dto));
  }

  @Patch(':id')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  // Staff edit their own display name from the staff settings page.
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Update a profile (your own; superuser may moderate any)' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentActor() actor: Actor) {
    // This took the id from the URL and never compared it to the caller, so
    // any signed-in user could edit — or suspend — anyone.
    const moderator = actor.role === ROLES.SUPERUSER;
    if (!moderator && actor.id !== id) {
      throw new ForbiddenException('You can only edit your own profile.');
    }
    // Account standing is not self-service: a user could un-suspend
    // themselves. (Rating and project counts are derived, so nobody sets them.)
    const MODERATED = ['status'] as const;
    if (!moderator) {
      const attempted = MODERATED.filter(k => (dto as any)[k] !== undefined);
      if (attempted.length) {
        throw new ForbiddenException(`Only operations staff can change: ${attempted.join(', ')}.`);
      }
    }
    if (moderator && actor.id === id && dto.status === 'suspended') {
      throw new ForbiddenException('You cannot suspend your own account.');
    }
    if (dto.status !== undefined && dto.status !== 'active') {
      const target = this.usersService.findById(id);
      if (target.role === 'superuser') throw new ForbiddenException('Operations accounts cannot be suspended here.');
    }
    const updated = this.usersService.update(id, dto);
    if (dto.status === 'suspended') {
      // A suspended worker cannot sign in to do the work, so their pending
      // invitations close rather than sit on the client's list.
      this.proposals.closeAllForWorker(id, 'The worker\'s account was suspended');
      this.audit.record({ kind: 'account.suspend', outcome: 'ok', detail: { userId: id } });
    }
    return redact(updated);
  }

  @Delete(':id')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('superuser')
  @ApiOperation({ summary: 'Delete a user (superuser only)' })
  remove(@Param('id') id: string, @CurrentActor() actor: Actor) {
    if (actor.id === id) throw new ForbiddenException('You cannot delete your own account.');
    // Deleting someone with projects, engagements or money would strand it —
    // escrow with no owner to refund, a contract with no worker to pay.
    const user = this.usersService.findById(id);
    if (user.role === 'superuser') {
      throw new ForbiddenException('Operations accounts cannot be deleted here.');
    }
    if ((user.walletBalance || 0) > 0) {
      throw new BadRequestException(`${user.name} still has ₹${user.walletBalance} in their wallet. Suspend the account instead.`);
    }
    const onWork = this.tasks.findAll({}, 'system').some((t: any) => t.clientId === id || t.workerId === id)
      || this.auditRequests.findAll({}).some((a: any) => a.expertId === id || a.payerId === id);
    if (onWork) {
      throw new BadRequestException(`${user.name} is part of existing projects or reviews. Suspend the account instead so the records stay intact.`);
    }
    // Pending invitations to an account that no longer exists close with it.
    this.proposals.closeAllForWorker(id, 'The worker\'s account was removed');
    this.audit.record({ kind: 'account.delete', outcome: 'ok', detail: { userId: id, email: user.email, role: user.role } });
    return this.usersService.delete(id);
  }

  @Post(':id/password')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Change your own password' })
  changePassword(@Param('id') id: string, @Body() dto: ChangePasswordDto, @CurrentActor() actor: Actor) {
    if (actor.id !== id) throw new ForbiddenException('You can only change your own password.');
    const result = this.usersService.changePassword(id, dto.currentPassword, dto.newPassword);
    // Changing the password signs out every other session. This one gets a
    // fresh token so the person who just changed it stays signed in.
    return { ...result, ...this.auth.issueFor(id) };
  }

  // POST /users/:id/password-reset was removed: an operator who can set
  // someone's password can sign in as them and withdraw their balance.

  @Post(':id/wallet/add')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client', 'worker', 'expert')
  @ApiOperation({
    summary: 'Deposit funds into a wallet (card processing fee applies)',
    description: 'Charges the deposit processing fee and credits the net. Returns the fee breakdown.',
  })
  addToWallet(@Param('id') id: string, @Body() dto: WalletDto, @CurrentActor() actor: Actor) {
    assertOwnWallet(id, actor.id, actor.role);
    return this.ledger.deposit(id, dto.amount);
  }

  // `POST :id/wallet/deduct` was removed. It debited a balance with no
  // transaction row and no fee — money left the system unrecorded, and nothing
  // in the app called it. Withdrawals go through /withdraw, which the ledger
  // records.

  @Post(':id/wallet/withdraw')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client', 'worker', 'expert')
  @ApiOperation({
    summary: 'Withdraw to an external account (payout fee applies)',
    description: 'Debits the full gross amount and returns the fee breakdown and net paid out.',
  })
  withdraw(@Param('id') id: string, @Body() dto: WalletDto, @CurrentActor() actor: Actor) {
    assertOwnWallet(id, actor.id, actor.role);
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
/** Fields anyone signed in may see about another user — enough to judge who they are working with. */
const PUBLIC_FIELDS = [
  'id', 'name', 'role', 'avatar', 'avatarColor', 'status', 'joinDate', 'bio', 'location', 'company',
  'skills', 'completedProjects', 'activeProjects', 'jobTitle', 'experienceLevel', 'hourlyRate', 'languages',
  'portfolioProjects', 'availability', 'specialization', 'reviewsDone', 'domains',
];

/**
 * The full record (minus the password) for yourself and for staff who read
 * every record; a public profile for everyone else. Every user's email,
 * phone and wallet balance used to be readable by any signed-in account.
 */
function viewFor(user: any, actor: Actor) {
  if (!user) return user;
  if (actor.id === user.id || canViewAnyRecord(actor.role)) return redact(user);
  const out: any = {};
  for (const k of PUBLIC_FIELDS) if (user[k] !== undefined) out[k] = user[k];
  return out;
}

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
