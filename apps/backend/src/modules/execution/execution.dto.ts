import { IsOptional, IsUUID } from 'class-validator';

export class CreateExecutionUploadDto {
  @IsUUID()
  runtimeId!: string;

  /** Optional; when set must match the runtime's active Published version. */
  @IsOptional()
  @IsUUID()
  versionId?: string;
}

export class ListExecutionsQueryDto {
  @IsUUID()
  runtimeId!: string;
}
