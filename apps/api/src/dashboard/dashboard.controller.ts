import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardSummary } from './types/dashboard-summary';
import { RiskHeatmap } from './types/risk-heatmap';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // No @Roles(): aggregate statistics only, readable by any authenticated
  // role, matching how unrestricted read routes already behave elsewhere.
  @Get('summary')
  getSummary(): Promise<DashboardSummary> {
    return this.dashboardService.getSummary();
  }

  @Get('heatmap')
  getHeatmap(): Promise<RiskHeatmap> {
    return this.dashboardService.getHeatmap();
  }
}
