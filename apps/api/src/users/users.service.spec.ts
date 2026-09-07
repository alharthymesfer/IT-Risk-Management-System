import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, Role, User } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

function prismaKnownError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('simulated prisma error', {
    code,
    clientVersion: 'test',
  });
}

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let auditLogService: { record: jest.Mock };

  const buildUser = (overrides: Partial<User> = {}): User => ({
    id: 'user-1',
    email: 'viewer@acme.test',
    passwordHash: 'hashed',
    firstName: 'Vera',
    lastName: 'Viewer',
    role: Role.VIEWER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    auditLogService = { record: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('create', () => {
    it('creates a user and never returns passwordHash', async () => {
      const user = buildUser();
      prisma.user.create.mockResolvedValue(user);

      const result = await service.create(
        {
          email: user.email,
          password: 'supersecret',
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        'admin-1',
      );

      expect(prisma.user.create).toHaveBeenCalled();
      const createArgs = prisma.user.create.mock.calls[0][0];
      expect(createArgs.data.passwordHash).not.toBe('supersecret');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('records a CREATE audit log entry without leaking the password hash', async () => {
      const user = buildUser();
      prisma.user.create.mockResolvedValue(user);

      await service.create(
        {
          email: user.email,
          password: 'supersecret',
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        'admin-1',
      );

      const recordedEntry = auditLogService.record.mock.calls[0][0];
      expect(recordedEntry).toMatchObject({
        userId: 'admin-1',
        action: 'CREATE',
        entityType: 'User',
        entityId: user.id,
      });
      expect(recordedEntry.newValue).not.toHaveProperty('passwordHash');
    });

    it('translates a duplicate-email DB error into ConflictException', async () => {
      prisma.user.create.mockRejectedValue(prismaKnownError('P2002'));

      await expect(
        service.create(
          {
            email: 'dup@acme.test',
            password: 'supersecret',
            firstName: 'A',
            lastName: 'B',
            role: Role.VIEWER,
          },
          'admin-1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the target user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', {}, 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('blocks an admin from demoting their own role', async () => {
      const admin = buildUser({ id: 'admin-1', role: Role.ADMIN });
      prisma.user.findUnique.mockResolvedValue(admin);

      await expect(
        service.update('admin-1', { role: Role.VIEWER }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('blocks an admin from deactivating their own account', async () => {
      const admin = buildUser({ id: 'admin-1', role: Role.ADMIN });
      prisma.user.findUnique.mockResolvedValue(admin);

      await expect(
        service.update('admin-1', { isActive: false }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('allows updating another user, hashing the password when provided', async () => {
      const target = buildUser({ id: 'user-2' });
      prisma.user.findUnique.mockResolvedValue(target);
      prisma.user.update.mockResolvedValue({ ...target, firstName: 'Updated' });

      const result = await service.update(
        'user-2',
        { firstName: 'Updated', password: 'new-password' },
        'admin-1',
      );

      const updateArgs = prisma.user.update.mock.calls[0][0];
      expect(updateArgs.data.firstName).toBe('Updated');
      expect(updateArgs.data.passwordHash).toBeDefined();
      expect(updateArgs.data.passwordHash).not.toBe('new-password');
      expect(result.firstName).toBe('Updated');
    });

    it('translates a duplicate-email DB error into ConflictException', async () => {
      const target = buildUser({ id: 'user-2' });
      prisma.user.findUnique.mockResolvedValue(target);
      prisma.user.update.mockRejectedValue(prismaKnownError('P2002'));

      await expect(
        service.update('user-2', { email: 'taken@acme.test' }, 'admin-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('blocks deleting your own account', async () => {
      await expect(service.remove('admin-1', 'admin-1')).rejects.toThrow(BadRequestException);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the target user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing', 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('translates a foreign-key constraint error into ConflictException', async () => {
      const target = buildUser({ id: 'user-2' });
      prisma.user.findUnique.mockResolvedValue(target);
      prisma.user.delete.mockRejectedValue(prismaKnownError('P2003'));

      await expect(service.remove('user-2', 'admin-1')).rejects.toThrow(ConflictException);
    });

    it('deletes the user when there are no dependent records', async () => {
      const target = buildUser({ id: 'user-2' });
      prisma.user.findUnique.mockResolvedValue(target);
      prisma.user.delete.mockResolvedValue(target);

      await expect(service.remove('user-2', 'admin-1')).resolves.toBeUndefined();
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-2' } });
    });
  });
});
