import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Risk, RiskStatus } from '@prisma/client';
import { assessRisk } from '@itrms/shared';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRiskDto } from './dto/create-risk.dto';
import { UpdateRiskDto } from './dto/update-risk.dto';
import { RiskWithAssessment } from './types/risk-with-assessment';

@Injectable()
export class RisksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateRiskDto, currentUserId: string): Promise<RiskWithAssessment> {
    await this.assertAssetExists(dto.assetId);
    await this.assertThreatExists(dto.threatId);
    await this.assertOwnerExists(dto.ownerId);
    if (dto.vulnerabilityId) {
      await this.assertVulnerabilityMatchesAsset(dto.vulnerabilityId, dto.assetId);
    }

    const risk = await this.prisma.risk.create({
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category,
        status: dto.status ?? RiskStatus.IDENTIFIED,
        likelihood: dto.likelihood,
        impact: dto.impact,
        assetId: dto.assetId,
        threatId: dto.threatId,
        vulnerabilityId: dto.vulnerabilityId,
        ownerId: dto.ownerId,
      },
    });

    await this.auditLogService.record({
      userId: currentUserId,
      action: 'CREATE',
      entityType: 'Risk',
      entityId: risk.id,
      newValue: risk,
    });

    return this.withAssessment(risk);
  }

  async findAll(): Promise<RiskWithAssessment[]> {
    const risks = await this.prisma.risk.findMany({ orderBy: { createdAt: 'asc' } });
    return risks.map((risk) => this.withAssessment(risk));
  }

  async findOne(id: string): Promise<RiskWithAssessment> {
    const risk = await this.prisma.risk.findUnique({ where: { id } });
    if (!risk) {
      throw new NotFoundException('Risk not found');
    }
    return this.withAssessment(risk);
  }

  async update(
    id: string,
    dto: UpdateRiskDto,
    currentUserId: string,
  ): Promise<RiskWithAssessment> {
    const existing = await this.prisma.risk.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Risk not found');
    }

    if (dto.assetId !== undefined) {
      await this.assertAssetExists(dto.assetId);
    }
    if (dto.threatId !== undefined) {
      await this.assertThreatExists(dto.threatId);
    }
    if (dto.ownerId !== undefined) {
      await this.assertOwnerExists(dto.ownerId);
    }
    if (dto.vulnerabilityId) {
      const effectiveAssetId = dto.assetId ?? existing.assetId;
      await this.assertVulnerabilityMatchesAsset(dto.vulnerabilityId, effectiveAssetId);
    }

    const data: Prisma.RiskUpdateInput = {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.likelihood !== undefined && { likelihood: dto.likelihood }),
      ...(dto.impact !== undefined && { impact: dto.impact }),
      ...(dto.assetId !== undefined && { asset: { connect: { id: dto.assetId } } }),
      ...(dto.threatId !== undefined && { threat: { connect: { id: dto.threatId } } }),
      ...(dto.ownerId !== undefined && { owner: { connect: { id: dto.ownerId } } }),
    };

    if (dto.vulnerabilityId !== undefined) {
      data.vulnerability = dto.vulnerabilityId
        ? { connect: { id: dto.vulnerabilityId } }
        : { disconnect: true };
    }

    const updated = await this.prisma.risk.update({ where: { id }, data });

    await this.auditLogService.record({
      userId: currentUserId,
      action: 'UPDATE',
      entityType: 'Risk',
      entityId: id,
      oldValue: existing,
      newValue: updated,
    });

    return this.withAssessment(updated);
  }

  async remove(id: string, currentUserId: string): Promise<void> {
    const existing = await this.prisma.risk.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Risk not found');
    }
    await this.prisma.risk.delete({ where: { id } });

    await this.auditLogService.record({
      userId: currentUserId,
      action: 'DELETE',
      entityType: 'Risk',
      entityId: id,
      oldValue: existing,
    });
  }

  private withAssessment(risk: Risk): RiskWithAssessment {
    return { ...risk, ...assessRisk(risk.likelihood, risk.impact) };
  }

  private async assertAssetExists(assetId: string): Promise<void> {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
      throw new BadRequestException('Asset not found');
    }
  }

  private async assertThreatExists(threatId: string): Promise<void> {
    const threat = await this.prisma.threat.findUnique({ where: { id: threatId } });
    if (!threat) {
      throw new BadRequestException('Threat not found');
    }
  }

  private async assertOwnerExists(ownerId: string): Promise<void> {
    const owner = await this.prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner) {
      throw new BadRequestException('Owner not found');
    }
  }

  private async assertVulnerabilityMatchesAsset(
    vulnerabilityId: string,
    assetId: string,
  ): Promise<void> {
    const vulnerability = await this.prisma.vulnerability.findUnique({
      where: { id: vulnerabilityId },
    });
    if (!vulnerability) {
      throw new BadRequestException('Vulnerability not found');
    }
    if (vulnerability.assetId !== assetId) {
      throw new BadRequestException('Vulnerability does not belong to the specified asset');
    }
  }
}
