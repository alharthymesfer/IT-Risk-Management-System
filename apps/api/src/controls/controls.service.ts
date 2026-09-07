import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Control, Prisma, Risk } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateControlDto } from './dto/create-control.dto';
import { UpdateControlDto } from './dto/update-control.dto';

@Injectable()
export class ControlsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateControlDto, currentUserId: string): Promise<Control> {
    const control = await this.prisma.control.create({ data: dto });
    await this.auditLogService.record({
      userId: currentUserId,
      action: 'CREATE',
      entityType: 'Control',
      entityId: control.id,
      newValue: control,
    });
    return control;
  }

  findAll(): Promise<Control[]> {
    return this.prisma.control.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async findOne(id: string): Promise<Control> {
    const control = await this.prisma.control.findUnique({ where: { id } });
    if (!control) {
      throw new NotFoundException('Control not found');
    }
    return control;
  }

  async update(id: string, dto: UpdateControlDto, currentUserId: string): Promise<Control> {
    const existing = await this.findOne(id);
    const updated = await this.prisma.control.update({ where: { id }, data: dto });
    await this.auditLogService.record({
      userId: currentUserId,
      action: 'UPDATE',
      entityType: 'Control',
      entityId: id,
      oldValue: existing,
      newValue: updated,
    });
    return updated;
  }

  async remove(id: string, currentUserId: string): Promise<void> {
    const existing = await this.findOne(id);
    try {
      await this.prisma.control.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('Cannot delete a control that is still linked to risks.');
      }
      throw error;
    }
    await this.auditLogService.record({
      userId: currentUserId,
      action: 'DELETE',
      entityType: 'Control',
      entityId: id,
      oldValue: existing,
    });
  }

  async findRisksForControl(controlId: string): Promise<Risk[]> {
    await this.findOne(controlId);
    const riskControls = await this.prisma.riskControl.findMany({
      where: { controlId },
      include: { risk: true },
      orderBy: { createdAt: 'asc' },
    });
    return riskControls.map((riskControl) => riskControl.risk);
  }

  async linkToRisk(controlId: string, riskId: string, currentUserId: string): Promise<void> {
    await this.findOne(controlId);
    await this.assertRiskExists(riskId);
    try {
      await this.prisma.riskControl.create({ data: { controlId, riskId } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Control is already linked to this risk.');
      }
      throw error;
    }
    await this.auditLogService.record({
      userId: currentUserId,
      action: 'LINK_RISK',
      entityType: 'Control',
      entityId: controlId,
      newValue: { riskId },
    });
  }

  async unlinkFromRisk(controlId: string, riskId: string, currentUserId: string): Promise<void> {
    const link = await this.prisma.riskControl.findUnique({
      where: { riskId_controlId: { riskId, controlId } },
    });
    if (!link) {
      throw new NotFoundException('This control is not linked to that risk');
    }
    await this.prisma.riskControl.delete({ where: { riskId_controlId: { riskId, controlId } } });
    await this.auditLogService.record({
      userId: currentUserId,
      action: 'UNLINK_RISK',
      entityType: 'Control',
      entityId: controlId,
      oldValue: { riskId },
    });
  }

  private async assertRiskExists(riskId: string): Promise<void> {
    const risk = await this.prisma.risk.findUnique({ where: { id: riskId } });
    if (!risk) {
      throw new BadRequestException('Risk not found');
    }
  }
}
