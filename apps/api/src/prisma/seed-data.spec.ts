import { TreatmentStatus } from '@prisma/client';
import { isValidImpact, isValidLikelihood } from '@itrms/shared';
import {
  DEMO_ASSETS,
  DEMO_CONTROLS,
  DEMO_PASSWORD,
  DEMO_RISK_CONTROLS,
  DEMO_RISKS,
  DEMO_THREATS,
  DEMO_TREATMENT_PLANS,
  DEMO_USERS,
  DEMO_VULNERABILITIES,
} from './seed-data';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uniqueValues<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

describe('seed-data', () => {
  describe('users', () => {
    it('has no duplicate emails', () => {
      const emails = DEMO_USERS.map((u) => u.email);
      expect(uniqueValues(emails)).toHaveLength(emails.length);
    });

    it('uses a non-trivial, clearly-labeled demo password (not a placeholder like "password")', () => {
      expect(DEMO_PASSWORD.length).toBeGreaterThanOrEqual(8);
      expect(DEMO_PASSWORD.toLowerCase()).not.toBe('password');
      expect(DEMO_PASSWORD.toLowerCase()).not.toBe('changeme');
    });
  });

  describe('fixed IDs', () => {
    it('are valid UUID-formatted strings, unique across every entity type', () => {
      const allIds = [
        ...DEMO_ASSETS.map((a) => a.id),
        ...DEMO_THREATS.map((t) => t.id),
        ...DEMO_VULNERABILITIES.map((v) => v.id),
        ...DEMO_RISKS.map((r) => r.id),
        ...DEMO_CONTROLS.map((c) => c.id),
        ...DEMO_TREATMENT_PLANS.map((p) => p.id),
      ];

      for (const id of allIds) {
        expect(id).toMatch(UUID_PATTERN);
      }
      expect(uniqueValues(allIds)).toHaveLength(allIds.length);
    });
  });

  describe('referential integrity (mirrors the DB foreign-key constraints)', () => {
    const assetIds = new Set(DEMO_ASSETS.map((a) => a.id));
    const threatIds = new Set(DEMO_THREATS.map((t) => t.id));
    const vulnerabilityById = new Map(DEMO_VULNERABILITIES.map((v) => [v.id, v]));
    const riskIds = new Set(DEMO_RISKS.map((r) => r.id));
    const controlIds = new Set(DEMO_CONTROLS.map((c) => c.id));
    const userEmails = new Set(DEMO_USERS.map((u) => u.email));

    it('every asset owner references a seeded user', () => {
      for (const asset of DEMO_ASSETS) {
        expect(userEmails.has(asset.ownerEmail)).toBe(true);
      }
    });

    it('every vulnerability references a seeded asset', () => {
      for (const vulnerability of DEMO_VULNERABILITIES) {
        expect(assetIds.has(vulnerability.assetId)).toBe(true);
      }
    });

    it('every risk references a seeded asset, threat, and owner', () => {
      for (const risk of DEMO_RISKS) {
        expect(assetIds.has(risk.assetId)).toBe(true);
        expect(threatIds.has(risk.threatId)).toBe(true);
        expect(userEmails.has(risk.ownerEmail)).toBe(true);
      }
    });

    it('every risk with a vulnerability has that vulnerability belong to the same asset (matches RisksService business rule)', () => {
      for (const risk of DEMO_RISKS) {
        if (risk.vulnerabilityId === null) {
          continue;
        }
        const vulnerability = vulnerabilityById.get(risk.vulnerabilityId);
        expect(vulnerability).toBeDefined();
        expect(vulnerability?.assetId).toBe(risk.assetId);
      }
    });

    it('at least one risk has no vulnerability, exercising the optional FK', () => {
      expect(DEMO_RISKS.some((r) => r.vulnerabilityId === null)).toBe(true);
    });

    it('every risk-control link references a seeded risk and control, with no duplicate pairs', () => {
      const pairs = DEMO_RISK_CONTROLS.map((link) => `${link.riskId}:${link.controlId}`);
      expect(uniqueValues(pairs)).toHaveLength(pairs.length);

      for (const link of DEMO_RISK_CONTROLS) {
        expect(riskIds.has(link.riskId)).toBe(true);
        expect(controlIds.has(link.controlId)).toBe(true);
      }
    });

    it('every treatment plan references a seeded risk and owner', () => {
      for (const plan of DEMO_TREATMENT_PLANS) {
        expect(riskIds.has(plan.riskId)).toBe(true);
        expect(userEmails.has(plan.ownerEmail)).toBe(true);
      }
    });
  });

  describe('risk-scoring inputs', () => {
    it('keeps every likelihood/impact within the shared 1-5 valid range', () => {
      for (const risk of DEMO_RISKS) {
        expect(isValidLikelihood(risk.likelihood)).toBe(true);
        expect(isValidImpact(risk.impact)).toBe(true);
      }
    });
  });

  describe('dashboard demo coverage', () => {
    it('includes an overdue, still-open treatment plan', () => {
      const hasOverdueOpenPlan = DEMO_TREATMENT_PLANS.some(
        (plan) =>
          plan.dueInDays < 0 &&
          (plan.status === TreatmentStatus.OPEN || plan.status === TreatmentStatus.IN_PROGRESS),
      );
      expect(hasOverdueOpenPlan).toBe(true);
    });

    it('includes a past-due but cancelled plan, so it must NOT count toward "overdue"', () => {
      const hasCancelledPastDuePlan = DEMO_TREATMENT_PLANS.some(
        (plan) => plan.dueInDays < 0 && plan.status === TreatmentStatus.CANCELLED,
      );
      expect(hasCancelledPastDuePlan).toBe(true);
    });
  });
});
