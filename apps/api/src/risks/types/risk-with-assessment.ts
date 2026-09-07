import { Risk } from '@prisma/client';
import { RiskAssessment } from '@itrms/shared';

/**
 * score/level are always computed here from persisted likelihood/impact via
 * packages/shared — never persisted in PostgreSQL. See Risk model in schema.prisma.
 */
export type RiskWithAssessment = Risk & RiskAssessment;
