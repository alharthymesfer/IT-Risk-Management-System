import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  Asset,
  AssetCategory,
  Criticality,
  Risk,
  RiskCategory,
  RiskStatus,
  Threat,
  ThreatCategory,
  User,
  Vulnerability,
} from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { RisksService } from './risks.service';

describe('RisksService', () => {
  let service: RisksService;
  let prisma: {
    risk: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    asset: { findUnique: jest.Mock };
    threat: { findUnique: jest.Mock };
    vulnerability: { findUnique: jest.Mock };
    user: { findUnique: jest.Mock };
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

  const otherAsset: Asset = { ...asset, id: 'asset-2' };

  const threat: Threat = {
    id: 'threat-1',
    name: 'SQL Injection',
    description: null,
    category: ThreatCategory.MALICIOUS,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const vulnerability: Vulnerability = {
    id: 'vuln-1',
    name: 'Unpatched DB engine',
    description: null,
    severity: Criticality.HIGH,
    assetId: 'asset-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const owner: User = {
    id: 'user-1',
    email: 'owner@acme.test',
    passwordHash: 'hashed',
    firstName: 'Rita',
    lastName: 'Manager',
    role: 'RISK_MANAGER',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const buildRisk = (overrides: Partial<Risk> = {}): Risk => ({
    id: 'risk-1',
    title: 'Unpatched database engine',
    description: null,
    category: RiskCategory.CYBERSECURITY,
    status: RiskStatus.IDENTIFIED,
    likelihood: 4,
    impact: 5,
    assetId: 'asset-1',
    threatId: 'threat-1',
    vulnerabilityId: 'vuln-1',
    ownerId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      risk: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      asset: { findUnique: jest.fn() },
      threat: { findUnique: jest.fn() },
      vulnerability: { findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
    };
    auditLogService = { record: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RisksService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get(RisksService);
  });

  describe('create', () => {
    const validDto = {
      title: 'Unpatched database engine',
      category: RiskCategory.CYBERSECURITY,
      likelihood: 4,
      impact: 5,
      assetId: 'asset-1',
      threatId: 'threat-1',
      vulnerabilityId: 'vuln-1',
      ownerId: 'user-1',
    };

    beforeEach(() => {
      prisma.asset.findUnique.mockResolvedValue(asset);
      prisma.threat.findUnique.mockResolvedValue(threat);
      prisma.user.findUnique.mockResolvedValue(owner);
      prisma.vulnerability.findUnique.mockResolvedValue(vulnerability);
    });

    it('computes score/level from likelihood*impact and never asks Prisma to store them', async () => {
      prisma.risk.create.mockResolvedValue(buildRisk());

      const result = await service.create(validDto, 'user-1');

      const createArgs = prisma.risk.create.mock.calls[0][0];
      expect(createArgs.data).not.toHaveProperty('score');
      expect(createArgs.data).not.toHaveProperty('level');
      expect(createArgs.data.likelihood).toBe(4);
      expect(createArgs.data.impact).toBe(5);

      // 4 * 5 = 20 -> CRITICAL (17-25 band)
      expect(result.score).toBe(20);
      expect(result.level).toBe('CRITICAL');
    });

    it('rejects when the asset does not exist', async () => {
      prisma.asset.findUnique.mockResolvedValue(null);

      await expect(service.create(validDto, 'user-1')).rejects.toThrow(BadRequestException);
      expect(prisma.risk.create).not.toHaveBeenCalled();
    });

    it('rejects when the threat does not exist', async () => {
      prisma.threat.findUnique.mockResolvedValue(null);

      await expect(service.create(validDto, 'user-1')).rejects.toThrow(BadRequestException);
      expect(prisma.risk.create).not.toHaveBeenCalled();
    });

    it('rejects when the owner does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.create(validDto, 'user-1')).rejects.toThrow(BadRequestException);
      expect(prisma.risk.create).not.toHaveBeenCalled();
    });

    it('rejects when the vulnerability belongs to a different asset', async () => {
      prisma.vulnerability.findUnique.mockResolvedValue({ ...vulnerability, assetId: 'asset-2' });

      await expect(service.create(validDto, 'user-1')).rejects.toThrow(BadRequestException);
      expect(prisma.risk.create).not.toHaveBeenCalled();
    });

    it('allows omitting vulnerabilityId entirely', async () => {
      prisma.risk.create.mockResolvedValue(buildRisk({ vulnerabilityId: null }));

      const { vulnerabilityId: _drop, ...dtoWithoutVuln } = validDto;
      await expect(service.create(dtoWithoutVuln, 'user-1')).resolves.toBeDefined();
      expect(prisma.vulnerability.findUnique).not.toHaveBeenCalled();
    });

    it('records a CREATE audit log entry', async () => {
      prisma.risk.create.mockResolvedValue(buildRisk());

      await service.create(validDto, 'user-1');

      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'CREATE',
          entityType: 'Risk',
          entityId: 'risk-1',
        }),
      );
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the risk does not exist', async () => {
      prisma.risk.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });

    it('derives score/level at read time rather than trusting stored fields', async () => {
      prisma.risk.findUnique.mockResolvedValue(buildRisk({ likelihood: 1, impact: 1 }));

      const result = await service.findOne('risk-1');

      expect(result.score).toBe(1);
      expect(result.level).toBe('LOW');
    });
  });

  describe('findAll', () => {
    it('computes score/level for every risk in the list', async () => {
      prisma.risk.findMany.mockResolvedValue([
        buildRisk({ id: 'r1', likelihood: 1, impact: 1 }),
        buildRisk({ id: 'r2', likelihood: 5, impact: 5 }),
      ]);

      const result = await service.findAll();

      expect(result).toEqual([
        expect.objectContaining({ id: 'r1', score: 1, level: 'LOW' }),
        expect.objectContaining({ id: 'r2', score: 25, level: 'CRITICAL' }),
      ]);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the risk does not exist', async () => {
      prisma.risk.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', {}, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('recomputes score/level after a likelihood/impact change', async () => {
      prisma.risk.findUnique.mockResolvedValue(buildRisk());
      prisma.risk.update.mockResolvedValue(buildRisk({ likelihood: 2, impact: 2 }));

      const result = await service.update('risk-1', { likelihood: 2, impact: 2 }, 'user-1');

      expect(result.score).toBe(4);
      expect(result.level).toBe('LOW');
    });

    it('clears the vulnerability link when vulnerabilityId is explicitly null', async () => {
      prisma.risk.findUnique.mockResolvedValue(buildRisk());
      prisma.risk.update.mockResolvedValue(buildRisk({ vulnerabilityId: null }));

      await service.update('risk-1', { vulnerabilityId: null }, 'user-1');

      const updateArgs = prisma.risk.update.mock.calls[0][0];
      expect(updateArgs.data.vulnerability).toEqual({ disconnect: true });
    });

    it('leaves the vulnerability link untouched when vulnerabilityId is omitted', async () => {
      prisma.risk.findUnique.mockResolvedValue(buildRisk());
      prisma.risk.update.mockResolvedValue(buildRisk());

      await service.update('risk-1', { title: 'Renamed' }, 'user-1');

      const updateArgs = prisma.risk.update.mock.calls[0][0];
      expect(updateArgs.data).not.toHaveProperty('vulnerability');
    });

    it('validates a new vulnerabilityId against the (possibly also-changing) assetId', async () => {
      prisma.risk.findUnique.mockResolvedValue(buildRisk({ assetId: 'asset-1' }));
      prisma.asset.findUnique.mockResolvedValue(otherAsset);
      prisma.vulnerability.findUnique.mockResolvedValue(vulnerability); // still tied to asset-1

      await expect(
        service.update('risk-1', { assetId: 'asset-2', vulnerabilityId: 'vuln-1' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.risk.update).not.toHaveBeenCalled();
    });

    it('records an UPDATE audit log entry with old and new values', async () => {
      prisma.risk.findUnique.mockResolvedValue(buildRisk());
      prisma.risk.update.mockResolvedValue(buildRisk({ likelihood: 2, impact: 2 }));

      await service.update('risk-1', { likelihood: 2, impact: 2 }, 'user-1');

      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'UPDATE',
          entityType: 'Risk',
          entityId: 'risk-1',
        }),
      );
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the risk does not exist', async () => {
      prisma.risk.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('deletes an existing risk and records a DELETE audit log entry', async () => {
      prisma.risk.findUnique.mockResolvedValue(buildRisk());
      prisma.risk.delete.mockResolvedValue(buildRisk());

      await expect(service.remove('risk-1', 'user-1')).resolves.toBeUndefined();
      expect(prisma.risk.delete).toHaveBeenCalledWith({ where: { id: 'risk-1' } });
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'DELETE',
          entityType: 'Risk',
          entityId: 'risk-1',
        }),
      );
    });
  });
});
