// src/ocr/dto/explain.dto.ts
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ExplainDto {
  @ApiProperty({
    description: 'Identificador numérico do documento que será explanado',
    example: 123,
  })
  @Transform(({ value }) => {
    const num = Number(value);
    return isNaN(num) ? value : num;
  })
  @IsNumber()
  id: number;

  @ApiProperty({
    description: 'Consulta ou pergunta relacionada ao conteúdo do documento',
    example: 'Explique o termo "nota fiscal" mencionado no documento.',
  })
  @IsString()
  @IsNotEmpty()
  query: string;
}