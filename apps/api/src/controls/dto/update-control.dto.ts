import { ControlType, Effectiveness } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateControlDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ControlType)
  type?: ControlType;

  @IsOptional()
  @IsEnum(Effectiveness)
  effectiveness?: Effectiveness;
}
