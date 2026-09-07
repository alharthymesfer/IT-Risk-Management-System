import { TreatmentStatus } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpdateTreatmentPlanDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  action?: string;

  @IsOptional()
  @IsUUID()
  riskId?: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  @IsOptional()
  @IsEnum(TreatmentStatus)
  status?: TreatmentStatus;
}
