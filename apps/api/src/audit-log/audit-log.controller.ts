import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { AuditLog, Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditLogService } from './audit-log.service';

// Audit logs record every mutation across the system, so read access is
// restricted to ADMIN and AUDITOR rather than left open like reference/library
// resources — the AUDITOR role exists specifically for this.
@Controller('audit-logs')
@Roles(Role.ADMIN, Role.AUDITOR)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  findAll(): Promise<AuditLog[]> {
    return this.auditLogService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AuditLog> {
    return this.auditLogService.findOne(id);
  }
}
