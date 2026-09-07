import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditLog, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface RecordAuditLogEntry {
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: RecordAuditLogEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        oldValue: this.toJson(entry.oldValue),
        newValue: this.toJson(entry.newValue),
      },
    });
  }

  findAll(): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string): Promise<AuditLog> {
    const log = await this.prisma.auditLog.findUnique({ where: { id } });
    if (!log) {
      throw new NotFoundException('Audit log entry not found');
    }
    return log;
  }

  /** Round-trips through JSON so Date fields (and any other non-plain values) become storable JSON. */
  private toJson(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
