import { Module } from '@nestjs/common';
import { OcrController } from './ocr/ocr.controller';
import { OcrService } from './ocr/ocr.service';
import { PrismaService } from './prisma.service';
import { LlmService } from './llm/llm.service';

@Module({
  controllers: [OcrController],
  providers: [OcrService, PrismaService, LlmService],
})
export class AppModule {}
