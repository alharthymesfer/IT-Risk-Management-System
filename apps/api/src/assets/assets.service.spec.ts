import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Asset, AssetCategory, Criticality, Prisma, Role, User } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { AssetsService } from './assets.service';

function prismaKnownError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('simulated prisma error', {
    code,
    clientVersion: 'test',
  });
}

describe('AssetsService', () => {
  let service: AssetsService;
  let prisma: {
    asset: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    user: { findUnique: jest.Mock };
  };
  let auditLogService: { record: jest.Mock };

  const buildUser = (overrides: Partial<User> = {}): User => ({
    id: 'owner-1',
    email: 'owner@acme.test',
    passwordHash: 'hashed',
    firstName: 'Olivia',
    lastName: 'Owner',
    role: Role.ASSET_OWNER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const buildAsset = (overrides: Partial<Asset> = {}): Asset => ({
    id: 'asset-1',
    name: 'Payroll DB',
    description: null,
    category: AssetCategory.DATABASE,
    criticality: Criticality.HIGH,
    ownerId: 'owner-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      asset: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      user: { findUnique: jest.fn() },
    };
    auditLogService = { record: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get(AssetsService);
  });

  describe('create', () => {
    it('creates an asset once the owner is verified to exist', async () => {
      const owner = buildUser();
      const asset = buildAsset();
      prisma.user.findUnique.mockResolvedValue(owner);
      prisma.asset.create.mockResolvedValue({ ...asset, owner });

      const result = await service.create(
        {
          name: asset.name,
          category: asset.category,
          criticality: asset.criticality,
          ownerId: owner.id,
        },
        'user-1',
      );

      expect(result.owner).not.toHaveProperty('passwordHash');
      expect(result.id).toBe(asset.id);
    });

    it('records a CREATE audit log entry', async () => {
      const owner = buildUser();
      const asset = buildAsset();
      prisma.user.findUnique.mockResolvedValue(owner);
      prisma.asset.create.mockResolvedValue({ ...asset, owner });

      await service.create(
        {
          name: asset.name,
          category: asset.category,
          criticality: asset.criticality,
          ownerId: owner.id,
        },
        'user-1',
      );

      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'CREATE',
          entityType: 'Asset',
          entityId: asset.id,
        }),
      );
    });

    it('rejects when the given ownerId does not reference an existing user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          {
            name: 'Anything',
            category: AssetCategory.SOFTWARE,
            criticality: Criticality.LOW,
            ownerId: 'missing-user',
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.asset.create).not.toHaveBeenCalled();
    });

    it('never leaks the nested owner.passwordHash into the audit log newValue', async () => {
      const owner = buildUser();
      const asset = buildAsset();
      prisma.user.findUnique.mockResolvedValue(owner);
      prisma.asset.create.mockResolvedValue({ ...asset, owner });

      await service.create(
        {
          name: asset.name,
          category: asset.category,
          criticality: asset.criticality,
          ownerId: owner.id,
        },
        'user-1',
      );

      const recordedEntry = auditLogService.record.mock.calls[0][0];
      expect(recordedEntry.newValue).not.toHaveProperty('passwordHash');
      expect(recordedEntry.newValue.owner).not.toHaveProperty('passwordHash');
      expect(JSON.stringify(recordedEntry.newValue)).not.toContain(owner.passwordHash);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the asset does not exist', async () => {
      prisma.asset.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });

    it('strips passwordHash from the nested owner', async () => {
      const owner = buildUser();
      prisma.asset.findUnique.mockResolvedValue({ ...buildAsset(), owner });

      const result = await service.findOne('asset-1');

      expect(result.owner).not.toHaveProperty('passwordHash');
    });
  });

  describe('update — ownership authorization', () => {
    it('throws NotFoundException when the asset does not exist', async () => {
      prisma.asset.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', {}, buildUser({ role: Role.ADMIN })),
      ).rejects.toThrow(NotFoundException);
    });

    it('allows ADMIN to update any asset regardless of ownership', async () => {
      const asset = buildAsset({ ownerId: 'someone-else' });
      const admin = buildUser({ id: 'admin-1', role: Role.ADMIN });
      prisma.asset.findUnique.mockResolvedValue(asset);
      prisma.asset.update.mockResolvedValue({ ...asset, owner: buildUser() });

      await expect(service.update('asset-1', { name: 'Renamed' }, admin)).resolves.toBeDefined();
    });

    it('allows RISK_MANAGER to update any asset regardless of ownership', async () => {
      const asset = buildAsset({ ownerId: 'someone-else' });
      const riskManager = buildUser({ id: 'rm-1', role: Role.RISK_MANAGER });
      prisma.asset.findUnique.mockResolvedValue(asset);
      prisma.asset.update.mockResolvedValue({ ...asset, owner: buildUser() });

      await expect(
        service.update('asset-1', { name: 'Renamed' }, riskManager),
      ).resolves.toBeDefined();
    });

    it('allows an ASSET_OWNER to update an asset they own', async () => {
      const owner = buildUser({ id: 'owner-1', role: Role.ASSET_OWNER });
      const asset = buildAsset({ ownerId: 'owner-1' });
      prisma.asset.findUnique.mockResolvedValue(asset);
      prisma.asset.update.mockResolvedValue({ ...asset, owner });

      await expect(service.update('asset-1', { name: 'Renamed' }, owner)).resolves.toBeDefined();
    });

    it('blocks an ASSET_OWNER from updating an asset they do not own', async () => {
      const otherOwner = buildUser({ id: 'owner-2', role: Role.ASSET_OWNER });
      const asset = buildAsset({ ownerId: 'owner-1' });
      prisma.asset.findUnique.mockResolvedValue(asset);

      await expect(
        service.update('asset-1', { name: 'Renamed' }, otherOwner),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.asset.update).not.toHaveBeenCalled();
    });

    it('rejects reassigning ownership to a nonexistent user', async () => {
      const admin = buildUser({ id: 'admin-1', role: Role.ADMIN });
      const asset = buildAsset();
      prisma.asset.findUnique.mockResolvedValue(asset);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.update('asset-1', { ownerId: 'missing-user' }, admin),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.asset.update).not.toHaveBeenCalled();
    });

    it('never leaks the nested owner.passwordHash into the audit log, in oldValue or newValue', async () => {
      const admin = buildUser({ id: 'admin-1', role: Role.ADMIN });
      const owner = buildUser();
      const asset = buildAsset();
      prisma.asset.findUnique.mockResolvedValue(asset);
      prisma.asset.update.mockResolvedValue({ ...asset, name: 'Renamed', owner });

      await service.update('asset-1', { name: 'Renamed' }, admin);

      const recordedEntry = auditLogService.record.mock.calls[0][0];
      expect(recordedEntry.oldValue).not.toHaveProperty('passwordHash');
      expect(recordedEntry.oldValue).not.toHaveProperty('owner');
      expect(recordedEntry.newValue).not.toHaveProperty('passwordHash');
      expect(recordedEntry.newValue.owner).not.toHaveProperty('passwordHash');
      expect(JSON.stringify(recordedEntry.oldValue)).not.toContain(owner.passwordHash);
      expect(JSON.stringify(recordedEntry.newValue)).not.toContain(owner.passwordHash);
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the asset does not exist', async () => {
      prisma.asset.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('translates a foreign-key constraint error into ConflictException', async () => {
      prisma.asset.findUnique.mockResolvedValue(buildAsset());
      prisma.asset.delete.mockRejectedValue(prismaKnownError('P2003'));

      await expect(service.remove('asset-1', 'user-1')).rejects.toThrow(ConflictException);
      expect(auditLogService.record).not.toHaveBeenCalled();
    });

    it('deletes the asset when there are no dependent records and records a DELETE audit log entry', async () => {
      prisma.asset.findUnique.mockResolvedValue(buildAsset());
      prisma.asset.delete.mockResolvedValue(buildAsset());

      await expect(service.remove('asset-1', 'user-1')).resolves.toBeUndefined();
      expect(prisma.asset.delete).toHaveBeenCalledWith({ where: { id: 'asset-1' } });
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'DELETE',
          entityType: 'Asset',
          entityId: 'asset-1',
        }),
      );
    });
  });
});
