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
import { Role, Vulnerability } from '@prisma/client';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateVulnerabilityDto } from './dto/create-vulnerability.dto';
import { UpdateVulnerabilityDto } from './dto/update-vulnerability.dto';
import { VulnerabilitiesService } from './vulnerabilities.service';

@Controller('vulnerabilities')
export class VulnerabilitiesController {
  constructor(private readonly vulnerabilitiesService: VulnerabilitiesService) {}

  @Roles(Role.ADMIN, Role.RISK_MANAGER)
  @Post()
  create(
    @Body() dto: CreateVulnerabilityDto,
    @CurrentUser() currentUser: User,
  ): Promise<Vulnerability> {
    return this.vulnerabilitiesService.create(dto, currentUser.id);
  }

  @Get()
  findAll(): Promise<Vulnerability[]> {
    return this.vulnerabilitiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Vulnerability> {
    return this.vulnerabilitiesService.findOne(id);
  }

  @Roles(Role.ADMIN, Role.RISK_MANAGER)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVulnerabilityDto,
    @CurrentUser() currentUser: User,
  ): Promise<Vulnerability> {
    return this.vulnerabilitiesService.update(id, dto, currentUser.id);
  }

  @Roles(Role.ADMIN, Role.RISK_MANAGER)
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: User): Promise<void> {
    return this.vulnerabilitiesService.remove(id, currentUser.id);
  }
}
