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

export class CreateTreatmentPlanDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  action: string;

  @IsUUID()
  riskId: string;

  @IsUUID()
  ownerId: string;

  @IsISO8601()
  dueDate: string;

  @IsOptional()
  @IsEnum(TreatmentStatus)
  status?: TreatmentStatus;
}
