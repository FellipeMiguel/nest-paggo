import { Module } from '@nestjs/common';
import { OcrModule } from './ocr/ocr.module';
import { DocumentsModule } from './documents/documents.module';

@Module({
  imports: [OcrModule, DocumentsModule],
})
export class AppModule {}
