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
import { CreateRiskDto } from './dto/create-risk.dto';
import { UpdateRiskDto } from './dto/update-risk.dto';
import { RisksService } from './risks.service';
import type { RiskWithAssessment } from './types/risk-with-assessment';

@Controller('risks')
export class RisksController {
  constructor(private readonly risksService: RisksService) {}

  @Roles(Role.ADMIN, Role.RISK_MANAGER)
  @Post()
  create(
    @Body() dto: CreateRiskDto,
    @CurrentUser() currentUser: User,
  ): Promise<RiskWithAssessment> {
    return this.risksService.create(dto, currentUser.id);
  }

  @Get()
  findAll(): Promise<RiskWithAssessment[]> {
    return this.risksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<RiskWithAssessment> {
    return this.risksService.findOne(id);
  }

  @Roles(Role.ADMIN, Role.RISK_MANAGER)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRiskDto,
    @CurrentUser() currentUser: User,
  ): Promise<RiskWithAssessment> {
    return this.risksService.update(id, dto, currentUser.id);
  }

  @Roles(Role.ADMIN, Role.RISK_MANAGER)
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: User): Promise<void> {
    return this.risksService.remove(id, currentUser.id);
  }
}
