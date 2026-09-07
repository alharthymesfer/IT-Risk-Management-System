import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RiskCategory } from '@prisma/client';
import { CreateRiskDto } from './create-risk.dto';

const VALID_PAYLOAD = {
  title: 'Unpatched database engine',
  category: RiskCategory.CYBERSECURITY,
  likelihood: 3,
  impact: 4,
  assetId: '11111111-1111-4111-8111-111111111111',
  threatId: '22222222-2222-4222-8222-222222222222',
  ownerId: '33333333-3333-4333-8333-333333333333',
};

function validateDto(overrides: Record<string, unknown> = {}) {
  const instance = plainToInstance(CreateRiskDto, { ...VALID_PAYLOAD, ...overrides });
  return validate(instance);
}

describe('CreateRiskDto validation', () => {
  it('accepts a fully valid payload', async () => {
    const errors = await validateDto();

    expect(errors).toHaveLength(0);
  });

  it.each([0, 6, -1, 1.5])(
    'rejects likelihood outside the 1-5 integer range (%s)',
    async (likelihood) => {
      const errors = await validateDto({ likelihood });

      expect(errors.some((e) => e.property === 'likelihood')).toBe(true);
    },
  );

  it.each([0, 6, -1, 2.5])(
    'rejects impact outside the 1-5 integer range (%s)',
    async (impact) => {
      const errors = await validateDto({ impact });

      expect(errors.some((e) => e.property === 'impact')).toBe(true);
    },
  );

  it.each([1, 2, 3, 4, 5])('accepts every valid likelihood/impact value (%s)', async (value) => {
    const errors = await validateDto({ likelihood: value, impact: value });

    expect(errors).toHaveLength(0);
  });

  it('rejects a non-UUID assetId', async () => {
    const errors = await validateDto({ assetId: 'not-a-uuid' });

    expect(errors.some((e) => e.property === 'assetId')).toBe(true);
  });

  it('rejects a non-UUID threatId', async () => {
    const errors = await validateDto({ threatId: 'not-a-uuid' });

    expect(errors.some((e) => e.property === 'threatId')).toBe(true);
  });

  it('rejects a non-UUID ownerId', async () => {
    const errors = await validateDto({ ownerId: 'not-a-uuid' });

    expect(errors.some((e) => e.property === 'ownerId')).toBe(true);
  });

  it('rejects an invalid RiskCategory', async () => {
    const errors = await validateDto({ category: 'NOT_A_CATEGORY' });

    expect(errors.some((e) => e.property === 'category')).toBe(true);
  });

  it('rejects a missing title', async () => {
    const errors = await validateDto({ title: '' });

    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('allows vulnerabilityId to be omitted (optional FK)', async () => {
    const errors = await validateDto();

    expect(errors).toHaveLength(0);
  });

  it('rejects a non-UUID vulnerabilityId when provided', async () => {
    const errors = await validateDto({ vulnerabilityId: 'not-a-uuid' });

    expect(errors.some((e) => e.property === 'vulnerabilityId')).toBe(true);
  });
});
