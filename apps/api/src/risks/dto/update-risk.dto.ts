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

export class UpdateRiskDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(RiskCategory)
  category?: RiskCategory;

  @IsOptional()
  @IsEnum(RiskStatus)
  status?: RiskStatus;

  @IsOptional()
  @IsInt()
  @Min(LIKELIHOOD_MIN)
  @Max(LIKELIHOOD_MAX)
  likelihood?: number;

  @IsOptional()
  @IsInt()
  @Min(IMPACT_MIN)
  @Max(IMPACT_MAX)
  impact?: number;

  @IsOptional()
  @IsUUID()
  assetId?: string;

  @IsOptional()
  @IsUUID()
  threatId?: string;

  // Omit to leave unchanged, pass a UUID to set/change it, pass null to clear it.
  @IsOptional()
  @IsUUID()
  vulnerabilityId?: string | null;

  @IsOptional()
  @IsUUID()
  ownerId?: string;
}
