import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SEED_USERS } from '../seed/seed.data';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private users: any[] = JSON.parse(JSON.stringify(SEED_USERS));
  private counter = 100;

  private generateId(): string {
    return 'u_' + Date.now() + '_' + (this.counter++);
  }

  findAll() {
    return this.users;
  }

  findById(id: string) {
    const user = this.users.find(u => u.id === id);
    if (!user) throw new NotFoundException(`User with id "${id}" not found`);
    return user;
  }

  findByEmail(email: string) {
    return this.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
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

    const user = {
      id: this.generateId(),
      status: 'active',
      joinDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      walletBalance: 0,
      avatar: dto.avatar || initials,
      avatarColor: dto.avatarColor || colors[Math.floor(Math.random() * colors.length)],
      skills: dto.skills || [],
      rating: 0,
      completedProjects: 0,
      specialization: dto.specialization || '',
      reviewsDone: 0,
      company: dto.company || '',
      location: dto.location || '',
      ...dto,
    };
    this.users.push(user);
    return user;
  }

  update(id: string, dto: UpdateUserDto) {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx === -1) throw new NotFoundException(`User with id "${id}" not found`);
    this.users[idx] = { ...this.users[idx], ...dto };
    return this.users[idx];
  }

  delete(id: string) {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx === -1) throw new NotFoundException(`User with id "${id}" not found`);
    this.users.splice(idx, 1);
    return { deleted: true };
  }

  deductFromWallet(id: string, amount: number) {
    const user = this.findById(id);
    if (user.walletBalance < amount) throw new BadRequestException('Insufficient wallet balance.');
    user.walletBalance -= amount;
    return user;
  }

  addToWallet(id: string, amount: number) {
    const user = this.findById(id);
    user.walletBalance += amount;
    return user;
  }

  resetToSeed() {
    this.users = JSON.parse(JSON.stringify(SEED_USERS));
  }
}
