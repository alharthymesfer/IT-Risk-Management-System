import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TreatmentPlan, TreatmentStatus } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTreatmentPlanDto } from './dto/create-treatment-plan.dto';
import { UpdateTreatmentPlanDto } from './dto/update-treatment-plan.dto';

@Injectable()
export class TreatmentPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateTreatmentPlanDto, currentUserId: string): Promise<TreatmentPlan> {
    await this.assertRiskExists(dto.riskId);
    await this.assertOwnerExists(dto.ownerId);

    const plan = await this.prisma.treatmentPlan.create({
      data: {
        action: dto.action,
        riskId: dto.riskId,
        ownerId: dto.ownerId,
        dueDate: new Date(dto.dueDate),
        status: dto.status ?? TreatmentStatus.OPEN,
      },
    });

    await this.auditLogService.record({
      userId: currentUserId,
      action: 'CREATE',
      entityType: 'TreatmentPlan',
      entityId: plan.id,
      newValue: plan,
    });

    return plan;
  }

  findAll(): Promise<TreatmentPlan[]> {
    return this.prisma.treatmentPlan.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async findOne(id: string): Promise<TreatmentPlan> {
    const plan = await this.prisma.treatmentPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Treatment plan not found');
    }
    return plan;
  }

  async update(
    id: string,
    dto: UpdateTreatmentPlanDto,
    currentUserId: string,
  ): Promise<TreatmentPlan> {
    const existing = await this.findOne(id);

    if (dto.riskId !== undefined) {
      await this.assertRiskExists(dto.riskId);
    }
    if (dto.ownerId !== undefined) {
      await this.assertOwnerExists(dto.ownerId);
    }

    const data: Prisma.TreatmentPlanUpdateInput = {
      ...(dto.action !== undefined && { action: dto.action }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.dueDate !== undefined && { dueDate: new Date(dto.dueDate) }),
      ...(dto.riskId !== undefined && { risk: { connect: { id: dto.riskId } } }),
      ...(dto.ownerId !== undefined && { owner: { connect: { id: dto.ownerId } } }),
    };

    const updated = await this.prisma.treatmentPlan.update({ where: { id }, data });

    await this.auditLogService.record({
      userId: currentUserId,
      action: 'UPDATE',
      entityType: 'TreatmentPlan',
      entityId: id,
      oldValue: existing,
      newValue: updated,
    });

    return updated;
  }

  async remove(id: string, currentUserId: string): Promise<void> {
    const existing = await this.findOne(id);
    await this.prisma.treatmentPlan.delete({ where: { id } });
    await this.auditLogService.record({
      userId: currentUserId,
      action: 'DELETE',
      entityType: 'TreatmentPlan',
      entityId: id,
      oldValue: existing,
    });
  }

  private async assertRiskExists(riskId: string): Promise<void> {
    const risk = await this.prisma.risk.findUnique({ where: { id: riskId } });
    if (!risk) {
      throw new BadRequestException('Risk not found');
    }
  }

  private async assertOwnerExists(ownerId: string): Promise<void> {
    const owner = await this.prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner) {
      throw new BadRequestException('Owner not found');
    }
  }
}
