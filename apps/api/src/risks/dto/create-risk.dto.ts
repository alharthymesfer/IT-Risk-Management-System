import { RiskCategory, RiskStatus } from '@prisma/client';
import { IMPACT_MAX, IMPACT_MIN, LIKELIHOOD_MAX, LIKELIHOOD_MIN } from '@itrms/shared';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRiskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(RiskCategory)
  category: RiskCategory;

  @IsOptional()
  @IsEnum(RiskStatus)
  status?: RiskStatus;

  @IsInt()
  @Min(LIKELIHOOD_MIN)
  @Max(LIKELIHOOD_MAX)
  likelihood: number;

  @IsInt()
  @Min(IMPACT_MIN)
  @Max(IMPACT_MAX)
  impact: number;

  @IsUUID()
  assetId: string;

  @IsUUID()
  threatId: string;

  @IsOptional()
  @IsUUID()
  vulnerabilityId?: string;

  @IsUUID()
  ownerId: string;
}
