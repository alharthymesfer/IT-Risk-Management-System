import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AssetsModule } from './assets/assets.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { AuthModule } from './auth/auth.module';
import { ControlsModule } from './controls/controls.module';
import { validateEnv } from './config/env.validation';
import { DashboardModule } from './dashboard/dashboard.module';
import { PrismaModule } from './prisma/prisma.module';
import { RisksModule } from './risks/risks.module';
import { ThreatsModule } from './threats/threats.module';
import { TreatmentPlansModule } from './treatment-plans/treatment-plans.module';
import { UsersModule } from './users/users.module';
import { VulnerabilitiesModule } from './vulnerabilities/vulnerabilities.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Serves the built React SPA (apps/web/dist, copied to apps/api/public at
    // build time) from the same origin/process as the API. `/api/**` is excluded
    // so it always falls through to the real controllers below instead of being
    // swallowed by the SPA's index.html fallback.
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api/{*splat}'],
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }]),
    PrismaModule,
    AuditLogModule,
    AuthModule,
    UsersModule,
    AssetsModule,
    ThreatsModule,
    VulnerabilitiesModule,
    RisksModule,
    ControlsModule,
    TreatmentPlansModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
