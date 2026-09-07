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
import { Control, Risk, Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ControlsService } from './controls.service';
import { CreateControlDto } from './dto/create-control.dto';
import { UpdateControlDto } from './dto/update-control.dto';

@Controller('controls')
export class ControlsController {
  constructor(private readonly controlsService: ControlsService) {}

  @Roles(Role.ADMIN, Role.RISK_MANAGER)
  @Post()
  create(@Body() dto: CreateControlDto, @CurrentUser() currentUser: User): Promise<Control> {
    return this.controlsService.create(dto, currentUser.id);
  }

  @Get()
  findAll(): Promise<Control[]> {
    return this.controlsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Control> {
    return this.controlsService.findOne(id);
  }

  @Roles(Role.ADMIN, Role.RISK_MANAGER)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateControlDto,
    @CurrentUser() currentUser: User,
  ): Promise<Control> {
    return this.controlsService.update(id, dto, currentUser.id);
  }

  @Roles(Role.ADMIN, Role.RISK_MANAGER)
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: User): Promise<void> {
    return this.controlsService.remove(id, currentUser.id);
  }

  @Get(':id/risks')
  findRisksForControl(@Param('id', ParseUUIDPipe) id: string): Promise<Risk[]> {
    return this.controlsService.findRisksForControl(id);
  }

  @Roles(Role.ADMIN, Role.RISK_MANAGER)
  @Post(':id/risks/:riskId')
  @HttpCode(204)
  linkToRisk(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('riskId', ParseUUIDPipe) riskId: string,
    @CurrentUser() currentUser: User,
  ): Promise<void> {
    return this.controlsService.linkToRisk(id, riskId, currentUser.id);
  }

  @Roles(Role.ADMIN, Role.RISK_MANAGER)
  @Delete(':id/risks/:riskId')
  @HttpCode(204)
  unlinkFromRisk(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('riskId', ParseUUIDPipe) riskId: string,
    @CurrentUser() currentUser: User,
  ): Promise<void> {
    return this.controlsService.unlinkFromRisk(id, riskId, currentUser.id);
  }
}
