// src/ocr/dto/explain.dto.ts
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class ExplainDto {
  @Transform(({ value }) => {
    const num = Number(value);
    return isNaN(num) ? value : num;
  })
  @IsNumber()
  id: number;

  @IsString()
  @IsNotEmpty()
  query: string;
}