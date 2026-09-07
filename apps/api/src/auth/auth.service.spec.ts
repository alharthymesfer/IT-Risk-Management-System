import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock } };
  let jwtService: { signAsync: jest.Mock };

  const buildUser = (overrides: Partial<User> = {}): User => ({
    id: 'user-1',
    email: 'admin@acme.test',
    passwordHash: bcrypt.hashSync('correct-password', 10),
    firstName: 'Ada',
    lastName: 'Admin',
    role: Role.ADMIN,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    prisma = { user: { findUnique: jest.fn() } };
    jwtService = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('validateUser', () => {
    it('returns the user when credentials are correct', async () => {
      const user = buildUser();
      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.validateUser(user.email, 'correct-password');

      expect(result).toEqual(user);
    });

    it('throws UnauthorizedException when the password is wrong', async () => {
      const user = buildUser();
      prisma.user.findUnique.mockResolvedValue(user);

      await expect(service.validateUser(user.email, 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.validateUser('nobody@acme.test', 'anything')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when the user is inactive', async () => {
      const user = buildUser({ isActive: false });
      prisma.user.findUnique.mockResolvedValue(user);

      await expect(service.validateUser(user.email, 'correct-password')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('login', () => {
    it('signs a JWT payload derived from the user and strips passwordHash from the response', async () => {
      const user = buildUser();

      const result = await service.login(user);

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
        role: user.role,
      });
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user.id).toBe(user.id);
    });
  });
});
