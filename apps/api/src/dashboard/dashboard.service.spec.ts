import { Test, TestingModule } from '@nestjs/testing';
import { RiskCategory, RiskStatus, TreatmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: {
    asset: { count: jest.Mock };
    threat: { count: jest.Mock };
    vulnerability: { count: jest.Mock };
    control: { count: jest.Mock };
    risk: { findMany: jest.Mock; groupBy: jest.Mock };
    treatmentPlan: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      asset: { count: jest.fn() },
      threat: { count: jest.fn() },
      vulnerability: { count: jest.fn() },
      control: { count: jest.fn() },
      risk: { findMany: jest.fn(), groupBy: jest.fn() },
      treatmentPlan: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DashboardService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(DashboardService);
  });

  describe('getSummary', () => {
    it('returns entity totals sourced directly from the database', async () => {
      prisma.asset.count.mockResolvedValue(4);
      prisma.threat.count.mockResolvedValue(3);
      prisma.vulnerability.count.mockResolvedValue(5);
      prisma.control.count.mockResolvedValue(2);
      prisma.risk.findMany.mockResolvedValue([]);
      prisma.risk.groupBy.mockResolvedValue([]);
      prisma.treatmentPlan.findMany.mockResolvedValue([]);

      const result = await service.getSummary();

      expect(result.totals).toEqual({
        assets: 4,
        threats: 3,
        vulnerabilities: 5,
        controls: 2,
        risks: 0,
        treatmentPlans: 0,
      });
    });

    it('derives risksByLevel from stored likelihood/impact rather than any stored score', async () => {
      prisma.asset.count.mockResolvedValue(0);
      prisma.threat.count.mockResolvedValue(0);
      prisma.vulnerability.count.mockResolvedValue(0);
      prisma.control.count.mockResolvedValue(0);
      prisma.risk.findMany.mockResolvedValue([
        { likelihood: 1, impact: 1 }, // score 1 -> LOW
        { likelihood: 2, impact: 3 }, // score 6 -> MEDIUM
        { likelihood: 3, impact: 4 }, // score 12 -> HIGH
        { likelihood: 5, impact: 5 }, // score 25 -> CRITICAL
        { likelihood: 5, impact: 4 }, // score 20 -> CRITICAL
      ]);
      prisma.risk.groupBy.mockResolvedValue([]);
      prisma.treatmentPlan.findMany.mockResolvedValue([]);

      const result = await service.getSummary();

      expect(result.risksByLevel).toEqual({ LOW: 1, MEDIUM: 1, HIGH: 1, CRITICAL: 2 });
      expect(result.totals.risks).toBe(5);
    });

    it('initializes every RiskStatus/RiskCategory to zero, filling only groups that exist', async () => {
      prisma.asset.count.mockResolvedValue(0);
      prisma.threat.count.mockResolvedValue(0);
      prisma.vulnerability.count.mockResolvedValue(0);
      prisma.control.count.mockResolvedValue(0);
      prisma.risk.findMany.mockResolvedValue([]);
      prisma.risk.groupBy.mockImplementation(({ by }: { by: string[] }) => {
        if (by[0] === 'status') {
          return Promise.resolve([{ status: RiskStatus.MITIGATING, _count: { _all: 3 } }]);
        }
        return Promise.resolve([
          { category: RiskCategory.CYBERSECURITY, _count: { _all: 2 } },
        ]);
      });
      prisma.treatmentPlan.findMany.mockResolvedValue([]);

      const result = await service.getSummary();

      expect(result.risksByStatus).toEqual({
        IDENTIFIED: 0,
        ASSESSED: 0,
        MITIGATING: 3,
        MONITORING: 0,
        CLOSED: 0,
      });
      expect(result.risksByCategory).toEqual({
        CYBERSECURITY: 2,
        OPERATIONAL: 0,
        COMPLIANCE: 0,
        FINANCIAL: 0,
        STRATEGIC: 0,
        THIRD_PARTY: 0,
      });
    });

    it('counts open and overdue treatment plans using dueDate and status', async () => {
      prisma.asset.count.mockResolvedValue(0);
      prisma.threat.count.mockResolvedValue(0);
      prisma.vulnerability.count.mockResolvedValue(0);
      prisma.control.count.mockResolvedValue(0);
      prisma.risk.findMany.mockResolvedValue([]);
      prisma.risk.groupBy.mockResolvedValue([]);

      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      prisma.treatmentPlan.findMany.mockResolvedValue([
        { status: TreatmentStatus.OPEN, dueDate: yesterday }, // open + overdue
        { status: TreatmentStatus.IN_PROGRESS, dueDate: nextWeek }, // open, not overdue
        { status: TreatmentStatus.COMPLETED, dueDate: yesterday }, // neither (already done)
        { status: TreatmentStatus.CANCELLED, dueDate: yesterday }, // neither (cancelled)
      ]);

      const result = await service.getSummary();

      expect(result.treatmentPlans).toEqual({ open: 2, overdue: 1 });
    });
  });

  describe('getHeatmap', () => {
    it('returns all 25 likelihood x impact cells, including empty ones', async () => {
      prisma.risk.findMany.mockResolvedValue([]);

      const result = await service.getHeatmap();

      expect(result.cells).toHaveLength(25);
      expect(result.totalRisks).toBe(0);
      expect(result.cells.every((cell) => cell.count === 0)).toBe(true);
    });

    it('computes score/level per cell and counts real risks into the matching cell', async () => {
      prisma.risk.findMany.mockResolvedValue([
        { likelihood: 4, impact: 5 },
        { likelihood: 4, impact: 5 },
        { likelihood: 1, impact: 1 },
      ]);

      const result = await service.getHeatmap();

      const highImpactCell = result.cells.find((c) => c.likelihood === 4 && c.impact === 5);
      expect(highImpactCell).toEqual({
        likelihood: 4,
        impact: 5,
        score: 20,
        level: 'CRITICAL',
        count: 2,
      });

      const lowCell = result.cells.find((c) => c.likelihood === 1 && c.impact === 1);
      expect(lowCell).toEqual({ likelihood: 1, impact: 1, score: 1, level: 'LOW', count: 1 });

      expect(result.totalRisks).toBe(3);
    });

    it('never persists or reads a stored score/level — always derives from likelihood/impact', async () => {
      prisma.risk.findMany.mockResolvedValue([{ likelihood: 3, impact: 4 }]);

      await service.getHeatmap();

      expect(prisma.risk.findMany).toHaveBeenCalledWith({
        select: { likelihood: true, impact: true },
      });
    });
  });
});
