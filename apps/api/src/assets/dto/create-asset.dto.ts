import { AssetCategory, Criticality } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(AssetCategory)
  category: AssetCategory;

  @IsEnum(Criticality)
  criticality: Criticality;

  @IsUUID()
  ownerId: string;
}
