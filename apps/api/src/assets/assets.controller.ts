import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import type { AssetWithOwner } from './types/asset-with-owner';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Roles(Role.ADMIN, Role.RISK_MANAGER)
  @Post()
  create(
    @Body() dto: CreateAssetDto,
    @CurrentUser() currentUser: User,
  ): Promise<AssetWithOwner> {
    return this.assetsService.create(dto, currentUser.id);
  }

  // No @Roles(): readable by any authenticated user (any role), matching how
  // unrestricted routes already behave elsewhere (e.g. GET /auth/me).
  @Get()
  findAll(): Promise<AssetWithOwner[]> {
    return this.assetsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AssetWithOwner> {
    return this.assetsService.findOne(id);
  }

  @Roles(Role.ADMIN, Role.RISK_MANAGER, Role.ASSET_OWNER)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetDto,
    @CurrentUser() currentUser: User,
  ): Promise<AssetWithOwner> {
    return this.assetsService.update(id, dto, currentUser);
  }

  @Roles(Role.ADMIN, Role.RISK_MANAGER)
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: User): Promise<void> {
    return this.assetsService.remove(id, currentUser.id);
  }
}
