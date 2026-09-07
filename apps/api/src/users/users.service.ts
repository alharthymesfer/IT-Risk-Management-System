import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser, toSafeUser } from '../common/types/safe-user';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { hashPassword } from './password.util';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateUserDto, currentUserId: string): Promise<SafeUser> {
    const passwordHash = await hashPassword(dto.password);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: dto.role,
          isActive: dto.isActive ?? true,
        },
      });
      await this.auditLogService.record({
        userId: currentUserId,
        action: 'CREATE',
        entityType: 'User',
        entityId: user.id,
        newValue: toSafeUser(user),
      });
      return toSafeUser(user);
    } catch (error) {
      throw this.translateKnownError(error);
    }
  }

  async findAll(): Promise<SafeUser[]> {
    const users = await this.prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    return users.map(toSafeUser);
  }

  async findOne(id: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return toSafeUser(user);
  }

  async update(id: string, dto: UpdateUserDto, currentUserId: string): Promise<SafeUser> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    if (id === currentUserId) {
      if (dto.role && dto.role !== Role.ADMIN) {
        throw new BadRequestException('Cannot change your own role away from ADMIN');
      }
      if (dto.isActive === false) {
        throw new BadRequestException('Cannot deactivate your own account');
      }
    }

    const data: Prisma.UserUpdateInput = {
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.firstName !== undefined && { firstName: dto.firstName }),
      ...(dto.lastName !== undefined && { lastName: dto.lastName }),
      ...(dto.role !== undefined && { role: dto.role }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    };

    if (dto.password) {
      data.passwordHash = await hashPassword(dto.password);
    }

    try {
      const updated = await this.prisma.user.update({ where: { id }, data });
      await this.auditLogService.record({
        userId: currentUserId,
        action: 'UPDATE',
        entityType: 'User',
        entityId: id,
        oldValue: toSafeUser(existing),
        newValue: toSafeUser(updated),
      });
      return toSafeUser(updated);
    } catch (error) {
      throw this.translateKnownError(error);
    }
  }

  async remove(id: string, currentUserId: string): Promise<void> {
    if (id === currentUserId) {
      throw new BadRequestException('Cannot delete your own account');
    }

    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (error) {
      throw this.translateKnownError(error);
    }
    await this.auditLogService.record({
      userId: currentUserId,
      action: 'DELETE',
      entityType: 'User',
      entityId: id,
      oldValue: toSafeUser(existing),
    });
  }

  private translateKnownError(error: unknown): Error {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return new ConflictException('A user with this email already exists');
      }
      if (error.code === 'P2003') {
        return new ConflictException(
          'Cannot delete a user who owns assets, risks, or treatment plans. Deactivate the account instead.',
        );
      }
    }
    return error as Error;
  }
}
