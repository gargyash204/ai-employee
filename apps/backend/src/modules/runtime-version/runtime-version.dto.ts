import { IsString, MaxLength } from 'class-validator';

export class UpdateDraftDto {
  @IsString()
  @MaxLength(5000)
  instructions!: string;
}
