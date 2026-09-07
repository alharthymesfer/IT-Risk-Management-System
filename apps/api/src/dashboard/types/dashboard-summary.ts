import { RiskCategory, RiskStatus } from '@prisma/client';
import { RiskLevel } from '@itrms/shared';

export interface DashboardSummary {
  totals: {
    assets: number;
    threats: number;
    vulnerabilities: number;
    risks: number;
    controls: number;
    treatmentPlans: number;
  };
  risksByLevel: Record<RiskLevel, number>;
  risksByStatus: Record<RiskStatus, number>;
  risksByCategory: Record<RiskCategory, number>;
  treatmentPlans: {
    open: number;
    overdue: number;
  };
}
