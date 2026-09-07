import { ControlType, Effectiveness } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateControlDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ControlType)
  type: ControlType;

  @IsEnum(Effectiveness)
  effectiveness: Effectiveness;
}
