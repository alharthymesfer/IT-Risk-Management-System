import {
  IMPACT_MAX,
  IMPACT_MIN,
  LIKELIHOOD_MAX,
  LIKELIHOOD_MIN,
  assessRisk,
  calculateRiskScore,
  getRiskLevel,
  isValidImpact,
  isValidLikelihood,
} from './risk-scoring';

describe('calculateRiskScore', () => {
  it('multiplies likelihood by impact', () => {
    expect(calculateRiskScore(1, 1)).toBe(1);
    expect(calculateRiskScore(3, 4)).toBe(12);
    expect(calculateRiskScore(5, 5)).toBe(25);
  });
});

describe('getRiskLevel', () => {
  it.each([
    [1, 'LOW'],
    [4, 'LOW'],
    [5, 'MEDIUM'],
    [9, 'MEDIUM'],
    [10, 'HIGH'],
    [16, 'HIGH'],
    [17, 'CRITICAL'],
    [25, 'CRITICAL'],
  ] as const)('maps score %i to %s', (score, level) => {
    expect(getRiskLevel(score)).toBe(level);
  });
});

describe('assessRisk', () => {
  it('combines score and level for every point on the 5x5 matrix', () => {
    expect(assessRisk(1, 1)).toEqual({ score: 1, level: 'LOW' });
    expect(assessRisk(2, 3)).toEqual({ score: 6, level: 'MEDIUM' });
    expect(assessRisk(4, 4)).toEqual({ score: 16, level: 'HIGH' });
    expect(assessRisk(5, 5)).toEqual({ score: 25, level: 'CRITICAL' });
    expect(assessRisk(5, 4)).toEqual({ score: 20, level: 'CRITICAL' });
  });
});

describe('isValidLikelihood / isValidImpact', () => {
  it('accepts every integer within the 1-5 scale', () => {
    for (let value = LIKELIHOOD_MIN; value <= LIKELIHOOD_MAX; value += 1) {
      expect(isValidLikelihood(value)).toBe(true);
    }
    for (let value = IMPACT_MIN; value <= IMPACT_MAX; value += 1) {
      expect(isValidImpact(value)).toBe(true);
    }
  });

  it('rejects out-of-range and non-integer values', () => {
    expect(isValidLikelihood(0)).toBe(false);
    expect(isValidLikelihood(6)).toBe(false);
    expect(isValidLikelihood(2.5)).toBe(false);
    expect(isValidImpact(0)).toBe(false);
    expect(isValidImpact(6)).toBe(false);
    expect(isValidImpact(3.5)).toBe(false);
  });
});
