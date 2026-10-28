import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';
import { round2 } from '../ledger/fee-config';
import { SELF_SERVICE_ROLES } from '../../common/constants/roles';
import { hashPassword, verifyPassword, isHashed } from '../../common/security/password.util';

/**
 * EER Specialization — Users Service
 *
 * Handles business logic (validation, error handling, avatar generation).
 * Delegates all data-access operations to UsersRepository.
 * The API response shape is IDENTICAL to the old monolithic approach.
 */
@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  // ── Public API (returns merged/flat objects) ──────────────────────────────

  findAll() {
    return this.usersRepository.findAll();
  }

  findById(id: string) {
    const user = this.usersRepository.findById(id);
    if (!user) throw new NotFoundException(`User with id "${id}" not found`);
    return user;
  }

  findByEmail(email: string) {
    return this.usersRepository.findByEmail(email);
  }

  findByPhone(phone: string) {
    return this.usersRepository.findByPhone(phone);
  }

  /**
   * `identifier` is an email, or a phone number ("+919876543210") the account
   * saved in its profile — anything with an @ is treated as an email.
   */
  login(identifier: string, password: string) {
    // One answer for every failure. Distinct "no account" / "wrong password"
    // messages told anyone which emails (or phones) are registered.
    const id = String(identifier || '').trim();
    const byPhone = !id.includes('@');
    const user = byPhone ? this.usersRepository.findByPhone(id) : this.findByEmail(id);
    if (!user || !verifyPassword(password, user.password)) {
      throw new BadRequestException(byPhone ? 'Incorrect phone number or password.' : 'Incorrect email or password.');
    }
    if (user.status === 'suspended') throw new BadRequestException('This account has been suspended. Contact support.');

    const session = {
      userId: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      avatarColor: user.avatarColor,
      // An account someone else created must choose its own password before
      // it can do anything else (see AuthMiddleware).
      mustChangePassword: !!user.mustChangePassword,
    };
    return { user, session };
  }

  /**
   * Public signup.
   *
   * `SELF_SERVICE_ROLES` existed and was never enforced: the DTO validated
   * `role` against every role in the system and this endpoint has no guard, so
   * an anonymous caller could POST `role: "admin"` and get a working admin
   * account. Staff are created by seeding or by another staff member — never
   * here. `createStaff()` is the deliberate path.
   */
  create(dto: CreateUserDto) {
    if (!SELF_SERVICE_ROLES.includes(dto.role as any)) {
      throw new ForbiddenException(
        `You cannot sign up as "${dto.role}". Public signup is for ${SELF_SERVICE_ROLES.join(' and ')} accounts.`,
      );
    }
    // Everyone who signs up gives a phone number — it signs in as well as the email.
    if (!dto.phone) {
      throw new BadRequestException('Enter your phone number with its country code.');
    }
    return this.insertUser(dto);
  }

  /**
   * Account creation on behalf of an authorised actor rather than public
   * signup — the seeder, a staff member, and the Expert Reviewer intake, which
   * creates the reviewer's account when an admin approves their application.
   * Skips the self-service role restriction; the caller is responsible for
   * having checked authority.
   */
  createPrivileged(
    dto: CreateUserDto,
    expertProfile?: { domains?: string[]; hourlyRate?: number },
    opts: PrivilegedOptions = {},
  ) {
    return this.insertUser(dto, expertProfile, opts);
  }

  private insertUser(
    dto: CreateUserDto,
    expertProfile?: { domains?: string[]; hourlyRate?: number },
    opts: PrivilegedOptions = {},
  ) {
    const existing = this.findByEmail(dto.email);
    if (existing) throw new BadRequestException('A user with this email already exists.');

    const name = String(dto.name || '').trim();
    if (name.length < 2) throw new BadRequestException('Enter a name of at least 2 characters.');

    // An approved application carries the password its applicant chose,
    // already checked and hashed when they applied. Anything arriving from a
    // form is plaintext and must meet the rules.
    if (!opts.passwordIsHash) assertStrongPassword(dto.password);
    if (dto.phone && this.usersRepository.findByPhone(dto.phone)) {
      throw new BadRequestException('Another account already uses this phone number.');
    }
    const initials = initialsOf(dto.name);
    const colors = [
      'linear-gradient(135deg,#6366f1,#4f46e5)',
      'linear-gradient(135deg,#10b981,#059669)',
      'linear-gradient(135deg,#a855f7,#7c3aed)',
      'linear-gradient(135deg,#ec4899,#be185d)',
    ];

    const id = this.usersRepository.generateId();

    // ── Insert into base USERS table ────────────────────────────────────
    const baseUser: any = {
      id,
      name,
      email: dto.email.trim().toLowerCase(),
      password: opts.passwordIsHash ? dto.password : hashPassword(dto.password),
      role: dto.role,
      avatar: dto.avatar || initials,
      avatarColor: dto.avatarColor || colors[Math.floor(Math.random() * colors.length)],
      status: 'active',
      joinDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      walletBalance: 0,
      phone: dto.phone || '',
      phoneCountryCode: dto.phone ? (dto.phoneCountryCode || '') : '',
      // Bumped on every password change; tokens carry it, so changing a
      // password signs out every session that used the old one.
      tokenVersion: 0,
      createdBy: opts.createdBy || null,
      mustChangePassword: !!opts.mustChangePassword,
    };
    this.usersRepository.insertBase(baseUser);

    // ── Insert into role-specific sub-table ──────────────────────────────
    if (dto.role === 'client') {
      this.usersRepository.insertClient({
        userId: id,
        company: dto.company || '',
        location: dto.location || '',
      });
    } else if (dto.role === 'worker') {
      this.usersRepository.insertWorker({
        userId: id,
        location: dto.location || '',
        skills: dto.skills || [],
      });
    } else if (dto.role === 'expert') {
      this.usersRepository.insertExpert({
        userId: id,
        specialization: dto.specialization || '',
        // Clients are only ever offered reviewers whose domains cover the
        // project category, so an expert created with none could never be
        // picked by anyone.
        domains: expertProfile?.domains || [],
        // What intake approved. A reviewer may narrow their domains but never
        // add one the intake desk did not vet.
        approvedDomains: expertProfile?.domains || [],
        hourlyRate: expertProfile?.hourlyRate || 0,
      });
    }

    // Return merged flat object (same shape as before)
    return this.usersRepository.findById(id);
  }

  update(id: string, dto: UpdateUserDto) {
    const existing = this.usersRepository.findById(id);
    if (!existing) throw new NotFoundException(`User with id "${id}" not found`);

    // ── Base USERS fields ────────────────────────────────────────────────
    const baseUpdates: any = {};
    if (dto.name !== undefined) {
      const name = String(dto.name).trim();
      if (name.length < 2) throw new BadRequestException('Enter a name of at least 2 characters.');
      baseUpdates.name = name;
      // Initials follow the name unless a custom avatar text was set.
      if (dto.avatar === undefined) baseUpdates.avatar = initialsOf(name);
    }
    if (dto.email !== undefined) {
      const email = String(dto.email).trim().toLowerCase();
      const owner = this.usersRepository.findByEmail(email);
      if (owner && owner.id !== id) throw new BadRequestException('Another account already uses this email address.');
      baseUpdates.email = email;
    }
    if (dto.phone) {
      // A phone signs in, so it can belong to one account only.
      const owner = this.usersRepository.findByPhone(dto.phone);
      if (owner && owner.id !== id) throw new BadRequestException('Another account already uses this phone number.');
    }
    for (const key of ['avatar', 'avatarColor', 'status', 'phone', 'phoneCountryCode', 'bio'] as const) {
      if ((dto as any)[key] !== undefined) baseUpdates[key] = (dto as any)[key];
    }
    this.usersRepository.updateBase(id, baseUpdates);

    // ── Role-specific fields ─────────────────────────────────────────────
    const base = this.usersRepository.getRawBase(id);
    const set = (sub: any, keys: string[]) => {
      for (const k of keys) if ((dto as any)[k] !== undefined) sub[k] = (dto as any)[k];
    };
    if (base?.role === 'client') {
      let sub = this.usersRepository.findClientSub(id);
      if (!sub) { this.usersRepository.insertClient({ userId: id, company: '', location: '' }); sub = this.usersRepository.findClientSub(id); }
      set(sub, ['company', 'location', 'companyDetails']);
      if (dto.companyDetails?.name !== undefined) sub.company = dto.companyDetails.name;
    } else if (base?.role === 'worker') {
      let sub = this.usersRepository.findWorkerSub(id);
      if (!sub) { this.usersRepository.insertWorker({ userId: id, location: '', skills: [] }); sub = this.usersRepository.findWorkerSub(id); }
      if (dto.availability !== undefined && dto.availability !== '') {
        if (!['Full-time', 'Part-time', 'Contract', 'Not Available'].includes(dto.availability)) {
          throw new BadRequestException('Availability must be Full-time, Part-time, Contract, Not Available or left unset.');
        }
      }
      set(sub, ['location', 'skills', 'jobTitle', 'experienceLevel', 'hourlyRate', 'languages', 'portfolioProjects', 'availability']);
    } else if (base?.role === 'expert') {
      let sub = this.usersRepository.findExpertSub(id);
      if (!sub) { this.usersRepository.insertExpert({ userId: id, specialization: '', domains: [], hourlyRate: 0 }); sub = this.usersRepository.findExpertSub(id); }
      if (dto.availability !== undefined) {
        const a = dto.availability;
        const ok = a && typeof a === 'object' && typeof a.status === 'string' && typeof a.type === 'string'
          && Number.isFinite(Number(a.maxCases)) && Number(a.maxCases) >= 0 && Number(a.maxCases) <= 50;
        if (!ok) throw new BadRequestException('Availability needs a status, a case limit and a case type.');
        dto.availability = { status: a.status.slice(0, 80), type: a.type.slice(0, 80), maxCases: Number(a.maxCases) };
      }
      if (dto.domains !== undefined && !dto.domains.length) {
        throw new BadRequestException('Choose at least one domain — clients can only pick reviewers who cover their category.');
      }
      if (dto.domains !== undefined) {
        // Domains are what the intake desk vetted. Self-assigning a new one
        // would put an unvetted reviewer in front of clients in that category.
        const approved: string[] = sub.approvedDomains || sub.domains || [];
        const extra = dto.domains.filter(d => !approved.includes(d));
        if (extra.length) {
          throw new BadRequestException(
            `You were approved to review ${approved.join(', ') || 'no categories'}. ` +
              `${extra.join(', ')} needs approval from the intake team.`,
          );
        }
      }
      set(sub, ['specialization', 'domains', 'hourlyRate', 'availability']);
    }

    return this.usersRepository.findById(id);
  }

  /** Lets TasksService supply the derived project counts. */
  setStatsProvider(fn: (id: string, role: string) => Record<string, any>) {
    this.usersRepository.setStatsProvider(fn);
  }

  /** A person changes their own password, proving they know the current one. */
  changePassword(id: string, currentPassword: string, newPassword: string) {
    const base = this.usersRepository.getRawBase(id);
    if (!base) throw new NotFoundException(`User with id "${id}" not found`);
    if (!verifyPassword(currentPassword, base.password)) {
      throw new BadRequestException('Your current password is not correct.');
    }
    assertStrongPassword(newPassword);
    if (verifyPassword(newPassword, base.password)) {
      throw new BadRequestException('Choose a password different from your current one.');
    }
    base.password = hashPassword(newPassword);
    // Every token issued before this moment stops working.
    base.tokenVersion = (base.tokenVersion || 0) + 1;
    base.mustChangePassword = false;
    return { changed: true };
  }

  /**
   * Sets a new password for someone who proved they own the account's email
   * (PasswordResetService checks the emailed link). Like a change, it ends
   * every session — and it clears a temporary password, because the owner has
   * now chosen their own.
   */
  resetPassword(id: string, newPassword: string) {
    const base = this.usersRepository.getRawBase(id);
    if (!base) throw new NotFoundException(`User with id "${id}" not found`);
    assertStrongPassword(newPassword);
    base.password = hashPassword(newPassword);
    base.tokenVersion = (base.tokenVersion || 0) + 1;
    base.mustChangePassword = false;
    return { changed: true };
  }

  // There is deliberately no "set someone else's password". An operator who
  // could reset a password could sign in as that person and withdraw their
  // balance, so the route was removed outright.

  delete(id: string) {
    const deleted = this.usersRepository.deleteById(id);
    if (!deleted) throw new NotFoundException(`User with id "${id}" not found`);
    return { deleted: true };
  }

  // Balances are rounded to paise on every write. Without this, repeated
  // float arithmetic drifts (24500 - 2634.99 lands on 21865.010000000002)
  // and balances stop comparing equal to the amounts that produced them.
  deductFromWallet(id: string, amount: number) {
    const base = this.usersRepository.getRawBase(id);
    if (!base) throw new NotFoundException(`User with id "${id}" not found`);
    if (base.walletBalance < amount) throw new BadRequestException('Insufficient wallet balance.');
    base.walletBalance = round2(base.walletBalance - amount);
    return this.usersRepository.findById(id);
  }

  addToWallet(id: string, amount: number) {
    const base = this.usersRepository.getRawBase(id);
    if (!base) throw new NotFoundException(`User with id "${id}" not found`);
    base.walletBalance = round2(base.walletBalance + amount);
    return this.usersRepository.findById(id);
  }

  // ── Reset all data to seed ────────────────────────────────────────────────
  resetToSeed() {
    this.usersRepository.resetToSeed();
  }
}

export interface PrivilegedOptions {
  /** Who created the account, for the record. */
  createdBy?: string;
  /** The account must choose its own password at first sign-in. */
  mustChangePassword?: boolean;
  /** `password` is already a bcrypt hash (an approved application). */
  passwordIsHash?: boolean;
}

function initialsOf(name: string): string {
  return String(name || '').trim().split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 2) || '?';
}

/**
 * The same rule every password form in the app shows: at least 8 characters
 * with an uppercase and a lowercase letter, a number and one of !@#$%^&*.
 * Enforced here as well, so the API cannot be used to set a weaker one.
 */
export function assertStrongPassword(pw: string) {
  // A value shaped like a bcrypt hash would be stored as-is and skip every
  // rule below — signing up with the hash of "a" made "a" a working password.
  if (isHashed(pw)) {
    throw new BadRequestException('That password cannot be used. Choose a different one.');
  }
  const ok = typeof pw === 'string' && pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw)
    && /\d/.test(pw) && /[!@#$%^&*]/.test(pw);
  if (!ok) {
    throw new BadRequestException(
      'Passwords need at least 8 characters, with an uppercase and a lowercase letter, a number and a symbol (!@#$%^&*).',
    );
  }
}
