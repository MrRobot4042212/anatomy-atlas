import { BODY_REGIONS, BODY_SYSTEMS, type BodyRegion, type BodySystem } from '@atlas/shared';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListStructuresDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsIn(BODY_SYSTEMS)
  system?: BodySystem;

  @IsOptional()
  @IsIn(BODY_REGIONS)
  region?: BodyRegion;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize = 50;
}

export class TreeQueryDto {
  @IsIn(BODY_SYSTEMS)
  system!: BodySystem;
}
