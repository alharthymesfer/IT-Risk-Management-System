import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Asset, Prisma, Role, User } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { toSafeUser } from '../common/types/safe-user';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetWithOwner } from './types/asset-with-owner';

const MANAGE_ANY_ASSET_ROLES: Role[] = [Role.ADMIN, Role.RISK_MANAGER];

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateAssetDto, currentUserId: string): Promise<AssetWithOwner> {
    await this.assertOwnerExists(dto.ownerId);

    try {
      const asset = await this.prisma.asset.create({
        data: {
          name: dto.name,
          description: dto.description,
          category: dto.category,
          criticality: dto.criticality,
          ownerId: dto.ownerId,
        },
        include: { owner: true },
      });
      await this.auditLogService.record({
        userId: currentUserId,
        action: 'CREATE',
        entityType: 'Asset',
        entityId: asset.id,
        newValue: this.toAssetWithSafeOwner(asset),
      });
      return this.toAssetWithSafeOwner(asset);
    } catch (error) {
      throw this.translateKnownError(error);
    }
  }

  async findAll(): Promise<AssetWithOwner[]> {
    const assets = await this.prisma.asset.findMany({
      include: { owner: true },
      orderBy: { createdAt: 'asc' },
    });
    return assets.map((asset) => this.toAssetWithSafeOwner(asset));
  }

  async findOne(id: string): Promise<AssetWithOwner> {
    const asset = await this.prisma.asset.findUnique({ where: { id }, include: { owner: true } });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
    return this.toAssetWithSafeOwner(asset);
  }

  async update(id: string, dto: UpdateAssetDto, currentUser: User): Promise<AssetWithOwner> {
    const existing = await this.prisma.asset.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Asset not found');
    }

    this.assertCanManage(existing, currentUser);

    if (dto.ownerId !== undefined) {
      // ASSET_OWNER may edit an asset it owns, but reassigning ownership is a
      // management action reserved for ADMIN/RISK_MANAGER — otherwise an owner
      // could hand off (or lose) accountability for an asset via the API even
      // though the UI never exposes this field to them.
      if (!MANAGE_ANY_ASSET_ROLES.includes(currentUser.role)) {
        throw new ForbiddenException('Only admins or risk managers can reassign asset ownership');
      }
      await this.assertOwnerExists(dto.ownerId);
    }

    const data: Prisma.AssetUpdateInput = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.criticality !== undefined && { criticality: dto.criticality }),
      ...(dto.ownerId !== undefined && { owner: { connect: { id: dto.ownerId } } }),
    };

    try {
      const updated = await this.prisma.asset.update({
        where: { id },
        data,
        include: { owner: true },
      });
      await this.auditLogService.record({
        userId: currentUser.id,
        action: 'UPDATE',
        entityType: 'Asset',
        entityId: id,
        oldValue: existing,
        newValue: this.toAssetWithSafeOwner(updated),
      });
      return this.toAssetWithSafeOwner(updated);
    } catch (error) {
      throw this.translateKnownError(error);
    }
  }

  async remove(id: string, currentUserId: string): Promise<void> {
    const existing = await this.prisma.asset.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Asset not found');
    }

    try {
      await this.prisma.asset.delete({ where: { id } });
    } catch (error) {
      throw this.translateKnownError(error);
    }
    await this.auditLogService.record({
      userId: currentUserId,
      action: 'DELETE',
      entityType: 'Asset',
      entityId: id,
      oldValue: existing,
    });
  }

  /**
   * ADMIN/RISK_MANAGER may manage any asset. ASSET_OWNER may only manage assets they own.
   * Enforced here (not just via @Roles) because ownership is per-resource, not per-role.
   */
  private assertCanManage(asset: Asset, currentUser: User): void {
    if (MANAGE_ANY_ASSET_ROLES.includes(currentUser.role)) {
      return;
    }
    if (currentUser.role === Role.ASSET_OWNER && asset.ownerId === currentUser.id) {
      return;
    }
    throw new ForbiddenException('You can only manage assets you own');
  }

  private async assertOwnerExists(ownerId: string): Promise<void> {
    const owner = await this.prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner) {
      throw new BadRequestException('Owner not found');
    }
  }

  private toAssetWithSafeOwner(asset: Asset & { owner: User }): AssetWithOwner {
    const { owner, ...rest } = asset;
    return { ...rest, owner: toSafeUser(owner) };
  }

  private translateKnownError(error: unknown): Error {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return new ConflictException(
        'Cannot delete an asset that still has linked vulnerabilities or risks.',
      );
    }
    return error as Error;
  }
}
