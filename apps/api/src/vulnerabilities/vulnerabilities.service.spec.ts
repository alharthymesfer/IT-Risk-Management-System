import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Asset, AssetCategory, Criticality, Prisma, Vulnerability } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { VulnerabilitiesService } from './vulnerabilities.service';

function prismaKnownError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('simulated prisma error', {
    code,
    clientVersion: 'test',
  });
}

describe('VulnerabilitiesService', () => {
  let service: VulnerabilitiesService;
  let prisma: {
    vulnerability: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    asset: { findUnique: jest.Mock };
  };
  let auditLogService: { record: jest.Mock };

  const asset: Asset = {
    id: 'asset-1',
    name: 'Payroll DB',
    description: null,
    category: AssetCategory.DATABASE,
    criticality: Criticality.HIGH,
    ownerId: 'owner-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const buildVulnerability = (overrides: Partial<Vulnerability> = {}): Vulnerability => ({
    id: 'vuln-1',
    name: 'Unpatched engine',
    description: null,
    severity: Criticality.HIGH,
    assetId: 'asset-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      vulnerability: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      asset: { findUnique: jest.fn() },
    };
    auditLogService = { record: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VulnerabilitiesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get(VulnerabilitiesService);
  });

  describe('create', () => {
    it('creates a vulnerability once the asset is verified to exist', async () => {
      prisma.asset.findUnique.mockResolvedValue(asset);
      prisma.vulnerability.create.mockResolvedValue(buildVulnerability());

      const result = await service.create(
        { name: 'Unpatched engine', severity: Criticality.HIGH, assetId: 'asset-1' },
        'user-1',
      );

      expect(result.id).toBe('vuln-1');
    });

    it('records a CREATE audit log entry', async () => {
      prisma.asset.findUnique.mockResolvedValue(asset);
      prisma.vulnerability.create.mockResolvedValue(buildVulnerability());

      await service.create(
        { name: 'Unpatched engine', severity: Criticality.HIGH, assetId: 'asset-1' },
        'user-1',
      );

      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'CREATE',
          entityType: 'Vulnerability',
          entityId: 'vuln-1',
        }),
      );
    });

    it('rejects when the asset does not exist', async () => {
      prisma.asset.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ name: 'X', severity: Criticality.LOW, assetId: 'missing' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.vulnerability.create).not.toHaveBeenCalled();
      expect(auditLogService.record).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the vulnerability does not exist', async () => {
      prisma.vulnerability.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', {}, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('validates a reassigned assetId', async () => {
      prisma.vulnerability.findUnique.mockResolvedValue(buildVulnerability());
      prisma.asset.findUnique.mockResolvedValue(null);

      await expect(
        service.update('vuln-1', { assetId: 'missing-asset' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.vulnerability.update).not.toHaveBeenCalled();
    });

    it('records an UPDATE audit log entry with old and new values', async () => {
      const existing = buildVulnerability();
      const updated = buildVulnerability({ name: 'Patched' });
      prisma.vulnerability.findUnique.mockResolvedValue(existing);
      prisma.vulnerability.update.mockResolvedValue(updated);

      await service.update('vuln-1', { name: 'Patched' }, 'user-1');

      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'UPDATE',
          entityType: 'Vulnerability',
          entityId: 'vuln-1',
          oldValue: existing,
          newValue: updated,
        }),
      );
    });
  });

  describe('remove', () => {
    it('translates a foreign-key constraint error into ConflictException', async () => {
      prisma.vulnerability.findUnique.mockResolvedValue(buildVulnerability());
      prisma.vulnerability.delete.mockRejectedValue(prismaKnownError('P2003'));

      await expect(service.remove('vuln-1', 'user-1')).rejects.toThrow(ConflictException);
      expect(auditLogService.record).not.toHaveBeenCalled();
    });

    it('deletes a vulnerability with no dependent risks and records a DELETE audit log entry', async () => {
      prisma.vulnerability.findUnique.mockResolvedValue(buildVulnerability());
      prisma.vulnerability.delete.mockResolvedValue(buildVulnerability());

      await expect(service.remove('vuln-1', 'user-1')).resolves.toBeUndefined();
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'DELETE',
          entityType: 'Vulnerability',
          entityId: 'vuln-1',
        }),
      );
    });
  });
});
