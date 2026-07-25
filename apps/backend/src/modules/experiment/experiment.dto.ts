import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class RunExperimentDto {
  @IsUUID()
  versionAId!: string;

  @IsOptional()
  @IsUUID()
  versionBId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100_000)
  document!: string;

  @IsOptional()
  @IsBoolean()
  runEvaluation?: boolean;

  @IsOptional()
  @IsUUID()
  datasetId?: string;
}
