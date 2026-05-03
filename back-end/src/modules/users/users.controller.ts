import { Controller, Get, Post, Patch, Delete, Param, Body, Headers, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login.dto';
import { WalletDto } from './dto/wallet.dto';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Users')
@Controller('users')
@UseGuards(RoleGuard)
@ApiHeader({ name: 'role', required: false, description: 'User role (client, worker, expert, superuser)' })
@ApiHeader({ name: 'user-id', required: false, description: 'Current user ID' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
  @Roles('client', 'worker', 'expert', 'superuser')
  @ApiOperation({ summary: 'Update user profile' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Roles('superuser')
  @ApiOperation({ summary: 'Delete a user (superuser only)' })
  remove(@Param('id') id: string) {
    return this.usersService.delete(id);
  }

  @Post(':id/wallet/add')
  @Roles('client', 'worker', 'superuser')
  @ApiOperation({ summary: 'Add funds to user wallet' })
  addToWallet(@Param('id') id: string, @Body() dto: WalletDto) {
    return this.usersService.addToWallet(id, dto.amount);
  }

  @Post(':id/wallet/deduct')
  @Roles('client', 'superuser')
  @ApiOperation({ summary: 'Deduct funds from user wallet' })
  deductFromWallet(@Param('id') id: string, @Body() dto: WalletDto) {
    return this.usersService.deductFromWallet(id, dto.amount);
  }
}
