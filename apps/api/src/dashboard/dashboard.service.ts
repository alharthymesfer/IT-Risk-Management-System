import { Injectable } from '@nestjs/common';
import { RiskCategory, RiskStatus, TreatmentStatus } from '@prisma/client';
import {
  assessRisk,
  IMPACT_MAX,
  IMPACT_MIN,
  LIKELIHOOD_MAX,
  LIKELIHOOD_MIN,
  RiskLevel,
} from '@itrms/shared';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardSummary } from './types/dashboard-summary';
import { RiskHeatmap, RiskHeatmapCell } from './types/risk-heatmap';

const RISK_LEVELS: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const OPEN_TREATMENT_STATUSES: TreatmentStatus[] = [
  TreatmentStatus.OPEN,
  TreatmentStatus.IN_PROGRESS,
];

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(): Promise<DashboardSummary> {
    const [
      assetCount,
      threatCount,
      vulnerabilityCount,
      controlCount,
      risks,
      risksByStatusRaw,
      risksByCategoryRaw,
      treatmentPlans,
    ] = await Promise.all([
      this.prisma.asset.count(),
      this.prisma.threat.count(),
      this.prisma.vulnerability.count(),
      this.prisma.control.count(),
      this.prisma.risk.findMany({ select: { likelihood: true, impact: true } }),
      this.prisma.risk.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.risk.groupBy({ by: ['category'], _count: { _all: true } }),
      this.prisma.treatmentPlan.findMany({ select: { status: true, dueDate: true } }),
    ]);

    const risksByLevel = RISK_LEVELS.reduce(
      (acc, level) => ({ ...acc, [level]: 0 }),
      {} as Record<RiskLevel, number>,
    );
    for (const risk of risks) {
      const { level } = assessRisk(risk.likelihood, risk.impact);
      risksByLevel[level] += 1;
    }

    const risksByStatus = Object.values(RiskStatus).reduce(
      (acc, status) => ({ ...acc, [status]: 0 }),
      {} as Record<RiskStatus, number>,
    );
    for (const group of risksByStatusRaw) {
      risksByStatus[group.status] = group._count._all;
    }

    const risksByCategory = Object.values(RiskCategory).reduce(
      (acc, category) => ({ ...acc, [category]: 0 }),
      {} as Record<RiskCategory, number>,
    );
    for (const group of risksByCategoryRaw) {
      risksByCategory[group.category] = group._count._all;
    }

    const now = new Date();
    const openTreatmentPlans = treatmentPlans.filter((plan) =>
      OPEN_TREATMENT_STATUSES.includes(plan.status),
    ).length;
    const overdueTreatmentPlans = treatmentPlans.filter(
      (plan) => OPEN_TREATMENT_STATUSES.includes(plan.status) && plan.dueDate < now,
    ).length;

    return {
      totals: {
        assets: assetCount,
        threats: threatCount,
        vulnerabilities: vulnerabilityCount,
        risks: risks.length,
        controls: controlCount,
        treatmentPlans: treatmentPlans.length,
      },
      risksByLevel,
      risksByStatus,
      risksByCategory,
      treatmentPlans: {
        open: openTreatmentPlans,
        overdue: overdueTreatmentPlans,
      },
    };
  }

  async getHeatmap(): Promise<RiskHeatmap> {
    const risks = await this.prisma.risk.findMany({ select: { likelihood: true, impact: true } });

    const countByCell = new Map<string, number>();
    for (const risk of risks) {
      const key = `${risk.likelihood}-${risk.impact}`;
      countByCell.set(key, (countByCell.get(key) ?? 0) + 1);
    }

    const cells: RiskHeatmapCell[] = [];
    for (let likelihood = LIKELIHOOD_MIN; likelihood <= LIKELIHOOD_MAX; likelihood++) {
      for (let impact = IMPACT_MIN; impact <= IMPACT_MAX; impact++) {
        const { score, level } = assessRisk(likelihood, impact);
        cells.push({
          likelihood,
          impact,
          score,
          level,
          count: countByCell.get(`${likelihood}-${impact}`) ?? 0,
        });
      }
    }

    return { totalRisks: risks.length, cells };
  }
}
