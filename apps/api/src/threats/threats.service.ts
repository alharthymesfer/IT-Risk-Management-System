import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Threat } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateThreatDto } from './dto/create-threat.dto';
import { UpdateThreatDto } from './dto/update-threat.dto';

@Injectable()
export class ThreatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateThreatDto, currentUserId: string): Promise<Threat> {
    const threat = await this.prisma.threat.create({ data: dto });
    await this.auditLogService.record({
      userId: currentUserId,
      action: 'CREATE',
      entityType: 'Threat',
      entityId: threat.id,
      newValue: threat,
    });
    return threat;
  }

  findAll(): Promise<Threat[]> {
    return this.prisma.threat.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async findOne(id: string): Promise<Threat> {
    const threat = await this.prisma.threat.findUnique({ where: { id } });
    if (!threat) {
      throw new NotFoundException('Threat not found');
    }
    return threat;
  }

  async update(id: string, dto: UpdateThreatDto, currentUserId: string): Promise<Threat> {
    const existing = await this.findOne(id);
    const updated = await this.prisma.threat.update({ where: { id }, data: dto });
    await this.auditLogService.record({
      userId: currentUserId,
      action: 'UPDATE',
      entityType: 'Threat',
      entityId: id,
      oldValue: existing,
      newValue: updated,
    });
    return updated;
  }

  async remove(id: string, currentUserId: string): Promise<void> {
    const existing = await this.findOne(id);
    try {
      await this.prisma.threat.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Cannot delete a threat that is still referenced by risks.');
      }
      throw error;
    }
    await this.auditLogService.record({
      userId: currentUserId,
      action: 'DELETE',
      entityType: 'Threat',
      entityId: id,
      oldValue: existing,
    });
  }
}
