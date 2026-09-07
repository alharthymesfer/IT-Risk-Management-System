export const LIKELIHOOD_MIN = 1;
export const LIKELIHOOD_MAX = 5;
export const IMPACT_MIN = 1;
export const IMPACT_MAX = 5;

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RiskAssessment {
  score: number;
  level: RiskLevel;
}

export function isValidLikelihood(value: number): boolean {
  return Number.isInteger(value) && value >= LIKELIHOOD_MIN && value <= LIKELIHOOD_MAX;
}

export function isValidImpact(value: number): boolean {
  return Number.isInteger(value) && value >= IMPACT_MIN && value <= IMPACT_MAX;
}

export function calculateRiskScore(likelihood: number, impact: number): number {
  return likelihood * impact;
}

/**
 * Bands: LOW 1-4, MEDIUM 5-9, HIGH 10-16, CRITICAL 17-25.
 */
export function getRiskLevel(score: number): RiskLevel {
  if (score >= 17) return 'CRITICAL';
  if (score >= 10) return 'HIGH';
  if (score >= 5) return 'MEDIUM';
  return 'LOW';
}

export function assessRisk(likelihood: number, impact: number): RiskAssessment {
  const score = calculateRiskScore(likelihood, impact);
  return { score, level: getRiskLevel(score) };
}
