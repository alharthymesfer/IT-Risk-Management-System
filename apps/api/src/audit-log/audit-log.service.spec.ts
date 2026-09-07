import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditLog } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from './audit-log.service';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let prisma: {
    auditLog: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  const buildLog = (overrides: Partial<AuditLog> = {}): AuditLog => ({
    id: 'log-1',
    userId: 'user-1',
    action: 'CREATE',
    entityType: 'Risk',
    entityId: 'risk-1',
    oldValue: null,
    newValue: { title: 'Unpatched database engine' },
    createdAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      auditLog: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditLogService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(AuditLogService);
  });

  describe('record', () => {
    it('persists actor, action, entity reference, and new value', async () => {
      prisma.auditLog.create.mockResolvedValue(buildLog());

      await service.record({
        userId: 'user-1',
        action: 'CREATE',
        entityType: 'Risk',
        entityId: 'risk-1',
        newValue: { title: 'Unpatched database engine' },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          action: 'CREATE',
          entityType: 'Risk',
          entityId: 'risk-1',
          oldValue: undefined,
          newValue: { title: 'Unpatched database engine' },
        },
      });
    });

    it('serializes Date fields in old/new value snapshots into JSON-safe values', async () => {
      prisma.auditLog.create.mockResolvedValue(buildLog());
      const entitySnapshot = { id: 'risk-1', createdAt: new Date('2026-01-01T00:00:00.000Z') };

      await service.record({
        userId: 'user-1',
        action: 'UPDATE',
        entityType: 'Risk',
        entityId: 'risk-1',
        oldValue: entitySnapshot,
        newValue: entitySnapshot,
      });

      const createArgs = prisma.auditLog.create.mock.calls[0][0];
      expect(createArgs.data.oldValue).toEqual({
        id: 'risk-1',
        createdAt: '2026-01-01T00:00:00.000Z',
      });
      expect(createArgs.data.newValue).toEqual({
        id: 'risk-1',
        createdAt: '2026-01-01T00:00:00.000Z',
      });
    });

    it('omits oldValue/newValue from the write when not provided', async () => {
      prisma.auditLog.create.mockResolvedValue(buildLog());

      await service.record({
        userId: null,
        action: 'DELETE',
        entityType: 'Threat',
        entityId: 'threat-1',
      });

      const createArgs = prisma.auditLog.create.mock.calls[0][0];
      expect(createArgs.data.oldValue).toBeUndefined();
      expect(createArgs.data.newValue).toBeUndefined();
      expect(createArgs.data.userId).toBeNull();
    });
  });

  describe('findAll', () => {
    it('orders entries most-recent-first', async () => {
      prisma.auditLog.findMany.mockResolvedValue([buildLog()]);

      await service.findAll();

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the entry does not exist', async () => {
      prisma.auditLog.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });

    it('returns the entry when found', async () => {
      prisma.auditLog.findUnique.mockResolvedValue(buildLog());

      const result = await service.findOne('log-1');

      expect(result.id).toBe('log-1');
    });
  });

  it('exposes no update or delete methods (append-only)', () => {
    expect((service as unknown as { update?: unknown }).update).toBeUndefined();
    expect((service as unknown as { remove?: unknown }).remove).toBeUndefined();
    expect((service as unknown as { delete?: unknown }).delete).toBeUndefined();
  });
});
