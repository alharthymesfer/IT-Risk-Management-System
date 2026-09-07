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
import { Role, Threat } from '@prisma/client';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateThreatDto } from './dto/create-threat.dto';
import { UpdateThreatDto } from './dto/update-threat.dto';
import { ThreatsService } from './threats.service';

@Controller('threats')
export class ThreatsController {
  constructor(private readonly threatsService: ThreatsService) {}

  @Roles(Role.ADMIN, Role.RISK_MANAGER)
  @Post()
  create(@Body() dto: CreateThreatDto, @CurrentUser() currentUser: User): Promise<Threat> {
    return this.threatsService.create(dto, currentUser.id);
  }

  @Get()
  findAll(): Promise<Threat[]> {
    return this.threatsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Threat> {
    return this.threatsService.findOne(id);
  }

  @Roles(Role.ADMIN, Role.RISK_MANAGER)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateThreatDto,
    @CurrentUser() currentUser: User,
  ): Promise<Threat> {
    return this.threatsService.update(id, dto, currentUser.id);
  }

  @Roles(Role.ADMIN, Role.RISK_MANAGER)
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: User): Promise<void> {
    return this.threatsService.remove(id, currentUser.id);
  }
}
