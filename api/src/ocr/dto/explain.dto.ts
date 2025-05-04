import { IsNumber, IsString } from 'class-validator';

export class ExplainDto {
  @IsNumber()
  id: number;

  @IsString()
  query: string;
}
