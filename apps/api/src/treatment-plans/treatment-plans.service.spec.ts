import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  Risk,
  RiskCategory,
  RiskStatus,
  TreatmentPlan,
  TreatmentStatus,
  User,
  Role as UserRole,
} from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { TreatmentPlansService } from './treatment-plans.service';

describe('TreatmentPlansService', () => {
  let service: TreatmentPlansService;
  let prisma: {
    treatmentPlan: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    risk: { findUnique: jest.Mock };
    user: { findUnique: jest.Mock };
  };
  let auditLogService: { record: jest.Mock };

  const risk: Risk = {
    id: 'risk-1',
    title: 'Unauthorized access',
    description: null,
    category: RiskCategory.CYBERSECURITY,
    status: RiskStatus.IDENTIFIED,
    likelihood: 3,
    impact: 4,
    assetId: 'asset-1',
    threatId: 'threat-1',
    vulnerabilityId: null,
    ownerId: 'owner-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const owner: User = {
    id: 'owner-1',
    email: 'owner@example.com',
    passwordHash: 'hash',
    firstName: 'Owner',
    lastName: 'One',
    role: UserRole.RISK_MANAGER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const buildPlan = (overrides: Partial<TreatmentPlan> = {}): TreatmentPlan => ({
    id: 'plan-1',
    riskId: 'risk-1',
    action: 'Roll out MFA',
    ownerId: 'owner-1',
    dueDate: new Date('2026-12-01'),
    status: TreatmentStatus.OPEN,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      treatmentPlan: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      risk: { findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
    };
    auditLogService = { record: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TreatmentPlansService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get(TreatmentPlansService);
  });

  describe('create', () => {
    it('creates a treatment plan once the risk and owner are verified to exist', async () => {
      prisma.risk.findUnique.mockResolvedValue(risk);
      prisma.user.findUnique.mockResolvedValue(owner);
      prisma.treatmentPlan.create.mockResolvedValue(buildPlan());

      const result = await service.create(
        { action: 'Roll out MFA', riskId: 'risk-1', ownerId: 'owner-1', dueDate: '2026-12-01' },
        'user-1',
      );

      expect(result.id).toBe('plan-1');
    });

    it('records a CREATE audit log entry', async () => {
      prisma.risk.findUnique.mockResolvedValue(risk);
      prisma.user.findUnique.mockResolvedValue(owner);
      prisma.treatmentPlan.create.mockResolvedValue(buildPlan());

      await service.create(
        { action: 'Roll out MFA', riskId: 'risk-1', ownerId: 'owner-1', dueDate: '2026-12-01' },
        'user-1',
      );

      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'CREATE',
          entityType: 'TreatmentPlan',
          entityId: 'plan-1',
        }),
      );
    });

    it('defaults status to OPEN when omitted', async () => {
      prisma.risk.findUnique.mockResolvedValue(risk);
      prisma.user.findUnique.mockResolvedValue(owner);
      prisma.treatmentPlan.create.mockResolvedValue(buildPlan());

      await service.create(
        { action: 'Roll out MFA', riskId: 'risk-1', ownerId: 'owner-1', dueDate: '2026-12-01' },
        'user-1',
      );

      expect(prisma.treatmentPlan.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ status: TreatmentStatus.OPEN }),
      });
    });

    it('converts the dueDate string into a Date before persisting', async () => {
      prisma.risk.findUnique.mockResolvedValue(risk);
      prisma.user.findUnique.mockResolvedValue(owner);
      prisma.treatmentPlan.create.mockResolvedValue(buildPlan());

      await service.create(
        { action: 'Roll out MFA', riskId: 'risk-1', ownerId: 'owner-1', dueDate: '2026-12-01' },
        'user-1',
      );

      const createArgs = prisma.treatmentPlan.create.mock.calls[0][0];
      expect(createArgs.data.dueDate).toBeInstanceOf(Date);
    });

    it('rejects when the risk does not exist', async () => {
      prisma.risk.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          { action: 'Roll out MFA', riskId: 'missing', ownerId: 'owner-1', dueDate: '2026-12-01' },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.treatmentPlan.create).not.toHaveBeenCalled();
      expect(auditLogService.record).not.toHaveBeenCalled();
    });

    it('rejects when the owner does not exist', async () => {
      prisma.risk.findUnique.mockResolvedValue(risk);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          { action: 'Roll out MFA', riskId: 'risk-1', ownerId: 'missing', dueDate: '2026-12-01' },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.treatmentPlan.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when missing', async () => {
      prisma.treatmentPlan.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when missing', async () => {
      prisma.treatmentPlan.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', {}, 'user-1')).rejects.toThrow(NotFoundException);
      expect(prisma.treatmentPlan.update).not.toHaveBeenCalled();
    });

    it('validates a reassigned riskId', async () => {
      prisma.treatmentPlan.findUnique.mockResolvedValue(buildPlan());
      prisma.risk.findUnique.mockResolvedValue(null);

      await expect(
        service.update('plan-1', { riskId: 'missing-risk' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.treatmentPlan.update).not.toHaveBeenCalled();
    });

    it('validates a reassigned ownerId', async () => {
      prisma.treatmentPlan.findUnique.mockResolvedValue(buildPlan());
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.update('plan-1', { ownerId: 'missing-owner' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.treatmentPlan.update).not.toHaveBeenCalled();
    });

    it('applies a partial status/action update without touching foreign keys', async () => {
      prisma.treatmentPlan.findUnique.mockResolvedValue(buildPlan());
      prisma.treatmentPlan.update.mockResolvedValue(
        buildPlan({ status: TreatmentStatus.IN_PROGRESS }),
      );

      await service.update('plan-1', { status: TreatmentStatus.IN_PROGRESS }, 'user-1');

      expect(prisma.risk.findUnique).not.toHaveBeenCalled();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.treatmentPlan.update).toHaveBeenCalledWith({
        where: { id: 'plan-1' },
        data: { status: TreatmentStatus.IN_PROGRESS },
      });
    });

    it('records an UPDATE audit log entry with old and new values', async () => {
      const existing = buildPlan();
      const updated = buildPlan({ status: TreatmentStatus.IN_PROGRESS });
      prisma.treatmentPlan.findUnique.mockResolvedValue(existing);
      prisma.treatmentPlan.update.mockResolvedValue(updated);

      await service.update('plan-1', { status: TreatmentStatus.IN_PROGRESS }, 'user-1');

      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'UPDATE',
          entityType: 'TreatmentPlan',
          entityId: 'plan-1',
          oldValue: existing,
          newValue: updated,
        }),
      );
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when missing', async () => {
      prisma.treatmentPlan.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing', 'user-1')).rejects.toThrow(NotFoundException);
      expect(prisma.treatmentPlan.delete).not.toHaveBeenCalled();
    });

    it('deletes an existing treatment plan and records a DELETE audit log entry', async () => {
      prisma.treatmentPlan.findUnique.mockResolvedValue(buildPlan());
      prisma.treatmentPlan.delete.mockResolvedValue(buildPlan());

      await expect(service.remove('plan-1', 'user-1')).resolves.toBeUndefined();
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'DELETE',
          entityType: 'TreatmentPlan',
          entityId: 'plan-1',
        }),
      );
    });
  });
});
