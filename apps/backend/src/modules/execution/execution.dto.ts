import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateExecutionDto {
  @IsUUID()
  runtimeId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100_000)
  document!: string;
}

export class ListExecutionsQueryDto {
  @IsUUID()
  runtimeId!: string;
}
