import { Module } from '@nestjs/common';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { ThreatsController } from './threats.controller';
import { ThreatsService } from './threats.service';

@Module({
  imports: [AuditLogModule],
  controllers: [ThreatsController],
  providers: [ThreatsService],
  exports: [ThreatsService],
})
export class ThreatsModule {}
