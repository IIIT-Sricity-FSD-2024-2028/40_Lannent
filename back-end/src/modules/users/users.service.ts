import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';

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

  login(email: string, password: string) {
    const user = this.findByEmail(email);
    if (!user) throw new NotFoundException('No account found with this email address.');
    if (user.password !== password) throw new BadRequestException('Incorrect password. Please try again.');
    if (user.status === 'suspended') throw new BadRequestException('This account has been suspended. Contact support.');

    const session = {
      userId: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      avatarColor: user.avatarColor,
    };
    return { user, session };
  }

  create(dto: CreateUserDto) {
    const existing = this.findByEmail(dto.email);
    if (existing) throw new BadRequestException('A user with this email already exists.');

    const initials = dto.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
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
      name: dto.name,
      email: dto.email,
      password: dto.password,
      role: dto.role,
      avatar: dto.avatar || initials,
      avatarColor: dto.avatarColor || colors[Math.floor(Math.random() * colors.length)],
      status: 'active',
      joinDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      walletBalance: 0,
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
        rating: 0,
        completedProjects: 0,
      });
    } else if (dto.role === 'expert') {
      this.usersRepository.insertExpert({
        userId: id,
        specialization: dto.specialization || '',
        reviewsDone: 0,
      });
    }

    // Return merged flat object (same shape as before)
    return this.usersRepository.findById(id);
  }

  update(id: string, dto: UpdateUserDto) {
    const existing = this.usersRepository.findById(id);
    if (!existing) throw new NotFoundException(`User with id "${id}" not found`);

    // ── Update base USERS fields ────────────────────────────────────────
    const baseUpdates: any = {};
    if (dto.name !== undefined) baseUpdates.name = dto.name;
    if (dto.email !== undefined) baseUpdates.email = dto.email;
    if (dto.password !== undefined) baseUpdates.password = dto.password;
    if (dto.role !== undefined) baseUpdates.role = dto.role;
    if (dto.avatar !== undefined) baseUpdates.avatar = dto.avatar;
    if (dto.avatarColor !== undefined) baseUpdates.avatarColor = dto.avatarColor;
    if (dto.status !== undefined) baseUpdates.status = dto.status;
    if (dto.walletBalance !== undefined) baseUpdates.walletBalance = dto.walletBalance;
    this.usersRepository.updateBase(id, baseUpdates);

    // ── Update role-specific sub-table fields ───────────────────────────
    const base = this.usersRepository.getRawBase(id);
    if (base?.role === 'client') {
      let sub = this.usersRepository.findClientSub(id);
      if (!sub) { this.usersRepository.insertClient({ userId: id, company: '', location: '' }); sub = this.usersRepository.findClientSub(id); }
      if (dto.company !== undefined) sub.company = dto.company;
      if (dto.location !== undefined) sub.location = dto.location;
    } else if (base?.role === 'worker') {
      let sub = this.usersRepository.findWorkerSub(id);
      if (!sub) { this.usersRepository.insertWorker({ userId: id, location: '', skills: [], rating: 0, completedProjects: 0 }); sub = this.usersRepository.findWorkerSub(id); }
      if (dto.location !== undefined) sub.location = dto.location;
      if (dto.skills !== undefined) sub.skills = dto.skills;
      if (dto.rating !== undefined) sub.rating = dto.rating;
      if (dto.completedProjects !== undefined) sub.completedProjects = dto.completedProjects;
    } else if (base?.role === 'expert') {
      let sub = this.usersRepository.findExpertSub(id);
      if (!sub) { this.usersRepository.insertExpert({ userId: id, specialization: '', reviewsDone: 0 }); sub = this.usersRepository.findExpertSub(id); }
      if (dto.specialization !== undefined) sub.specialization = dto.specialization;
      if (dto.reviewsDone !== undefined) sub.reviewsDone = dto.reviewsDone;
    }

    return this.usersRepository.findById(id);
  }

  delete(id: string) {
    const deleted = this.usersRepository.deleteById(id);
    if (!deleted) throw new NotFoundException(`User with id "${id}" not found`);
    return { deleted: true };
  }

  deductFromWallet(id: string, amount: number) {
    const base = this.usersRepository.getRawBase(id);
    if (!base) throw new NotFoundException(`User with id "${id}" not found`);
    if (base.walletBalance < amount) throw new BadRequestException('Insufficient wallet balance.');
    base.walletBalance -= amount;
    return this.usersRepository.findById(id);
  }

  addToWallet(id: string, amount: number) {
    const base = this.usersRepository.getRawBase(id);
    if (!base) throw new NotFoundException(`User with id "${id}" not found`);
    base.walletBalance += amount;
    return this.usersRepository.findById(id);
  }

  // ── Reset all data to seed ────────────────────────────────────────────────
  resetToSeed() {
    this.usersRepository.resetToSeed();
  }
}
