import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, Threat, ThreatCategory } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { ThreatsService } from './threats.service';

function prismaKnownError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('simulated prisma error', {
    code,
    clientVersion: 'test',
  });
}

describe('ThreatsService', () => {
  let service: ThreatsService;
  let prisma: {
    threat: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let auditLogService: { record: jest.Mock };

  const buildThreat = (overrides: Partial<Threat> = {}): Threat => ({
    id: 'threat-1',
    name: 'Phishing',
    description: null,
    category: ThreatCategory.MALICIOUS,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      threat: {
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
        ThreatsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get(ThreatsService);
  });

  it('creates a threat', async () => {
    prisma.threat.create.mockResolvedValue(buildThreat());

    const result = await service.create(
      { name: 'Phishing', category: ThreatCategory.MALICIOUS },
      'user-1',
    );

    expect(result.id).toBe('threat-1');
  });

  it('records a CREATE audit log entry', async () => {
    prisma.threat.create.mockResolvedValue(buildThreat());

    await service.create({ name: 'Phishing', category: ThreatCategory.MALICIOUS }, 'user-1');

    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        action: 'CREATE',
        entityType: 'Threat',
        entityId: 'threat-1',
      }),
    );
  });

  it('throws NotFoundException from findOne when missing', async () => {
    prisma.threat.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException from update when missing', async () => {
    prisma.threat.findUnique.mockResolvedValue(null);

    await expect(service.update('missing', {}, 'user-1')).rejects.toThrow(NotFoundException);
    expect(prisma.threat.update).not.toHaveBeenCalled();
  });

  it('records an UPDATE audit log entry with old and new values', async () => {
    const existing = buildThreat();
    const updated = buildThreat({ name: 'Renamed' });
    prisma.threat.findUnique.mockResolvedValue(existing);
    prisma.threat.update.mockResolvedValue(updated);

    await service.update('threat-1', { name: 'Renamed' }, 'user-1');

    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        action: 'UPDATE',
        entityType: 'Threat',
        entityId: 'threat-1',
        oldValue: existing,
        newValue: updated,
      }),
    );
  });

  it('throws NotFoundException from remove when missing', async () => {
    prisma.threat.findUnique.mockResolvedValue(null);

    await expect(service.remove('missing', 'user-1')).rejects.toThrow(NotFoundException);
    expect(prisma.threat.delete).not.toHaveBeenCalled();
  });

  it('translates a foreign-key constraint error into ConflictException on delete', async () => {
    prisma.threat.findUnique.mockResolvedValue(buildThreat());
    prisma.threat.delete.mockRejectedValue(prismaKnownError('P2003'));

    await expect(service.remove('threat-1', 'user-1')).rejects.toThrow(ConflictException);
    expect(auditLogService.record).not.toHaveBeenCalled();
  });

  it('deletes a threat with no dependent risks and records a DELETE audit log entry', async () => {
    const existing = buildThreat();
    prisma.threat.findUnique.mockResolvedValue(existing);
    prisma.threat.delete.mockResolvedValue(existing);

    await expect(service.remove('threat-1', 'user-1')).resolves.toBeUndefined();
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        action: 'DELETE',
        entityType: 'Threat',
        entityId: 'threat-1',
        oldValue: existing,
      }),
    );
  });
});
