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
import { Role, TreatmentPlan } from '@prisma/client';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateTreatmentPlanDto } from './dto/create-treatment-plan.dto';
import { UpdateTreatmentPlanDto } from './dto/update-treatment-plan.dto';
import { TreatmentPlansService } from './treatment-plans.service';

@Controller('treatment-plans')
export class TreatmentPlansController {
  constructor(private readonly treatmentPlansService: TreatmentPlansService) {}

  @Roles(Role.ADMIN, Role.RISK_MANAGER)
  @Post()
  create(
    @Body() dto: CreateTreatmentPlanDto,
    @CurrentUser() currentUser: User,
  ): Promise<TreatmentPlan> {
    return this.treatmentPlansService.create(dto, currentUser.id);
  }

  @Get()
  findAll(): Promise<TreatmentPlan[]> {
    return this.treatmentPlansService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<TreatmentPlan> {
    return this.treatmentPlansService.findOne(id);
  }

  @Roles(Role.ADMIN, Role.RISK_MANAGER)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTreatmentPlanDto,
    @CurrentUser() currentUser: User,
  ): Promise<TreatmentPlan> {
    return this.treatmentPlansService.update(id, dto, currentUser.id);
  }

  @Roles(Role.ADMIN, Role.RISK_MANAGER)
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: User): Promise<void> {
    return this.treatmentPlansService.remove(id, currentUser.id);
  }
}
