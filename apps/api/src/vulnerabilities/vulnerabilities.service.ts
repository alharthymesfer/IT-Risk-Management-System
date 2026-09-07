import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Vulnerability } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVulnerabilityDto } from './dto/create-vulnerability.dto';
import { UpdateVulnerabilityDto } from './dto/update-vulnerability.dto';

@Injectable()
export class VulnerabilitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateVulnerabilityDto, currentUserId: string): Promise<Vulnerability> {
    await this.assertAssetExists(dto.assetId);
    const vulnerability = await this.prisma.vulnerability.create({ data: dto });
    await this.auditLogService.record({
      userId: currentUserId,
      action: 'CREATE',
      entityType: 'Vulnerability',
      entityId: vulnerability.id,
      newValue: vulnerability,
    });
    return vulnerability;
  }

  findAll(): Promise<Vulnerability[]> {
    return this.prisma.vulnerability.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async findOne(id: string): Promise<Vulnerability> {
    const vulnerability = await this.prisma.vulnerability.findUnique({ where: { id } });
    if (!vulnerability) {
      throw new NotFoundException('Vulnerability not found');
    }
    return vulnerability;
  }

  async update(
    id: string,
    dto: UpdateVulnerabilityDto,
    currentUserId: string,
  ): Promise<Vulnerability> {
    const existing = await this.findOne(id);
    if (dto.assetId !== undefined) {
      await this.assertAssetExists(dto.assetId);
    }
    const updated = await this.prisma.vulnerability.update({ where: { id }, data: dto });
    await this.auditLogService.record({
      userId: currentUserId,
      action: 'UPDATE',
      entityType: 'Vulnerability',
      entityId: id,
      oldValue: existing,
      newValue: updated,
    });
    return updated;
  }

  async remove(id: string, currentUserId: string): Promise<void> {
    const existing = await this.findOne(id);
    try {
      await this.prisma.vulnerability.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException(
          'Cannot delete a vulnerability that is still referenced by risks.',
        );
      }
      throw error;
    }
    await this.auditLogService.record({
      userId: currentUserId,
      action: 'DELETE',
      entityType: 'Vulnerability',
      entityId: id,
      oldValue: existing,
    });
  }

  private async assertAssetExists(assetId: string): Promise<void> {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
      throw new BadRequestException('Asset not found');
    }
  }
}
