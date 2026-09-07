import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role, User } from '@prisma/client';
import { AuthService } from '../auth.service';
import { LocalStrategy } from './local.strategy';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let authService: { validateUser: jest.Mock };

  const user: User = {
    id: 'user-1',
    email: 'admin@acme.test',
    passwordHash: 'hashed',
    firstName: 'Ada',
    lastName: 'Admin',
    role: Role.ADMIN,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    authService = { validateUser: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [LocalStrategy, { provide: AuthService, useValue: authService }],
    }).compile();

    strategy = module.get(LocalStrategy);
  });

  it('delegates credential validation to AuthService.validateUser', async () => {
    authService.validateUser.mockResolvedValue(user);

    const result = await strategy.validate(user.email, 'correct-password');

    expect(authService.validateUser).toHaveBeenCalledWith(user.email, 'correct-password');
    expect(result).toEqual(user);
  });

  it('propagates UnauthorizedException from AuthService.validateUser', async () => {
    authService.validateUser.mockRejectedValue(new UnauthorizedException('Invalid credentials'));

    await expect(strategy.validate(user.email, 'wrong-password')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
