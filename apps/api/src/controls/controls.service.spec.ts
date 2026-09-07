import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  Control,
  ControlType,
  Effectiveness,
  Prisma,
  Risk,
  RiskCategory,
  RiskStatus,
} from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { ControlsService } from './controls.service';

function prismaKnownError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('simulated prisma error', {
    code,
    clientVersion: 'test',
  });
}

describe('ControlsService', () => {
  let service: ControlsService;
  let prisma: {
    control: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    riskControl: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      delete: jest.Mock;
    };
    risk: { findUnique: jest.Mock };
  };
  let auditLogService: { record: jest.Mock };

  const buildControl = (overrides: Partial<Control> = {}): Control => ({
    id: 'control-1',
    name: 'MFA enforcement',
    description: null,
    type: ControlType.PREVENTIVE,
    effectiveness: Effectiveness.HIGH,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const buildRisk = (overrides: Partial<Risk> = {}): Risk => ({
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
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      control: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      riskControl: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      risk: { findUnique: jest.fn() },
    };
    auditLogService = { record: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ControlsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get(ControlsService);
  });

  describe('create', () => {
    it('creates a control', async () => {
      prisma.control.create.mockResolvedValue(buildControl());

      const result = await service.create(
        { name: 'MFA enforcement', type: ControlType.PREVENTIVE, effectiveness: Effectiveness.HIGH },
        'user-1',
      );

      expect(result.id).toBe('control-1');
    });

    it('records a CREATE audit log entry', async () => {
      prisma.control.create.mockResolvedValue(buildControl());

      await service.create(
        { name: 'MFA enforcement', type: ControlType.PREVENTIVE, effectiveness: Effectiveness.HIGH },
        'user-1',
      );

      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'CREATE',
          entityType: 'Control',
          entityId: 'control-1',
        }),
      );
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when missing', async () => {
      prisma.control.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when missing', async () => {
      prisma.control.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', {}, 'user-1')).rejects.toThrow(NotFoundException);
      expect(prisma.control.update).not.toHaveBeenCalled();
    });

    it('records an UPDATE audit log entry with old and new values', async () => {
      const existing = buildControl();
      const updated = buildControl({ effectiveness: Effectiveness.LOW });
      prisma.control.findUnique.mockResolvedValue(existing);
      prisma.control.update.mockResolvedValue(updated);

      await service.update('control-1', { effectiveness: Effectiveness.LOW }, 'user-1');

      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'UPDATE',
          entityType: 'Control',
          entityId: 'control-1',
          oldValue: existing,
          newValue: updated,
        }),
      );
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when missing', async () => {
      prisma.control.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing', 'user-1')).rejects.toThrow(NotFoundException);
      expect(prisma.control.delete).not.toHaveBeenCalled();
    });

    it('translates a foreign-key constraint error into ConflictException', async () => {
      prisma.control.findUnique.mockResolvedValue(buildControl());
      prisma.control.delete.mockRejectedValue(prismaKnownError('P2003'));

      await expect(service.remove('control-1', 'user-1')).rejects.toThrow(ConflictException);
      expect(auditLogService.record).not.toHaveBeenCalled();
    });

    it('deletes a control with no risk links and records a DELETE audit log entry', async () => {
      prisma.control.findUnique.mockResolvedValue(buildControl());
      prisma.control.delete.mockResolvedValue(buildControl());

      await expect(service.remove('control-1', 'user-1')).resolves.toBeUndefined();
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'DELETE',
          entityType: 'Control',
          entityId: 'control-1',
        }),
      );
    });
  });

  describe('findRisksForControl', () => {
    it('throws NotFoundException when the control does not exist', async () => {
      prisma.control.findUnique.mockResolvedValue(null);

      await expect(service.findRisksForControl('missing')).rejects.toThrow(NotFoundException);
    });

    it('returns the risks linked to a control', async () => {
      const linkedRisk = buildRisk();
      prisma.control.findUnique.mockResolvedValue(buildControl());
      prisma.riskControl.findMany.mockResolvedValue([
        { riskId: 'risk-1', controlId: 'control-1', createdAt: new Date(), risk: linkedRisk },
      ]);

      const result = await service.findRisksForControl('control-1');

      expect(result).toEqual([linkedRisk]);
    });
  });

  describe('linkToRisk', () => {
    it('throws NotFoundException when the control does not exist', async () => {
      prisma.control.findUnique.mockResolvedValue(null);

      await expect(service.linkToRisk('missing', 'risk-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.riskControl.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the risk does not exist', async () => {
      prisma.control.findUnique.mockResolvedValue(buildControl());
      prisma.risk.findUnique.mockResolvedValue(null);

      await expect(service.linkToRisk('control-1', 'missing', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.riskControl.create).not.toHaveBeenCalled();
    });

    it('creates the link once both the control and risk are verified to exist', async () => {
      prisma.control.findUnique.mockResolvedValue(buildControl());
      prisma.risk.findUnique.mockResolvedValue(buildRisk());
      prisma.riskControl.create.mockResolvedValue({
        riskId: 'risk-1',
        controlId: 'control-1',
        createdAt: new Date(),
      });

      await service.linkToRisk('control-1', 'risk-1', 'user-1');

      expect(prisma.riskControl.create).toHaveBeenCalledWith({
        data: { controlId: 'control-1', riskId: 'risk-1' },
      });
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'LINK_RISK',
          entityType: 'Control',
          entityId: 'control-1',
          newValue: { riskId: 'risk-1' },
        }),
      );
    });

    it('translates a duplicate-link error into ConflictException', async () => {
      prisma.control.findUnique.mockResolvedValue(buildControl());
      prisma.risk.findUnique.mockResolvedValue(buildRisk());
      prisma.riskControl.create.mockRejectedValue(prismaKnownError('P2002'));

      await expect(service.linkToRisk('control-1', 'risk-1', 'user-1')).rejects.toThrow(
        ConflictException,
      );
      expect(auditLogService.record).not.toHaveBeenCalled();
    });
  });

  describe('unlinkFromRisk', () => {
    it('throws NotFoundException when the link does not exist', async () => {
      prisma.riskControl.findUnique.mockResolvedValue(null);

      await expect(service.unlinkFromRisk('control-1', 'risk-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.riskControl.delete).not.toHaveBeenCalled();
    });

    it('deletes an existing link and records an UNLINK_RISK audit log entry', async () => {
      prisma.riskControl.findUnique.mockResolvedValue({
        riskId: 'risk-1',
        controlId: 'control-1',
        createdAt: new Date(),
      });
      prisma.riskControl.delete.mockResolvedValue({});

      await service.unlinkFromRisk('control-1', 'risk-1', 'user-1');

      expect(prisma.riskControl.delete).toHaveBeenCalledWith({
        where: { riskId_controlId: { riskId: 'risk-1', controlId: 'control-1' } },
      });
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'UNLINK_RISK',
          entityType: 'Control',
          entityId: 'control-1',
          oldValue: { riskId: 'risk-1' },
        }),
      );
    });
  });
});
