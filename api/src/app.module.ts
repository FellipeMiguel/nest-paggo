import { Module } from '@nestjs/common';
import { OcrController } from './ocr/ocr.controller';
import { OcrService } from './ocr/ocr.service';
import { PrismaService } from './prisma.service';

@Module({
  controllers: [OcrController],
  providers: [OcrService, PrismaService],
})
export class AppModule {}
