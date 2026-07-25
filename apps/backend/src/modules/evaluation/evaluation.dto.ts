import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class RunEvaluationDto {
  @IsUUID()
  datasetId!: string;

  @IsUUID()
  runtimeVersionId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100_000)
  document!: string;
}

export class CreateDatasetDto {
  @IsUUID()
  runtimeId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class CreateCaseDto {
  @IsUUID()
  datasetId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  question!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10_000)
  expectedAnswer!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];
}

export class UpdateCaseDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  question?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(10_000)
  expectedAnswer?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];
}

export class CompareVersionsDto {
  @IsUUID()
  datasetId!: string;

  @IsUUID()
  runtimeVersionA!: string;

  @IsUUID()
  runtimeVersionB!: string;
}
