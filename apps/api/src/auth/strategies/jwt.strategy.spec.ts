import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Role, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: { user: { findUnique: jest.Mock } };

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
    prisma = { user: { findUnique: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-secret') },
        },
      ],
    }).compile();

    strategy = module.get(JwtStrategy);
  });

  it('returns the user for a payload pointing at an active user', async () => {
    prisma.user.findUnique.mockResolvedValue(user);

    const result = await strategy.validate({ sub: user.id, email: user.email, role: user.role });

    expect(result).toEqual(user);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: user.id } });
  });

  it('throws UnauthorizedException when the user no longer exists', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 'missing', email: 'x@acme.test', role: Role.VIEWER }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when the user has been deactivated', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, isActive: false });

    await expect(
      strategy.validate({ sub: user.id, email: user.email, role: user.role }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
