import { Injectable } from '@nestjs/common';
import { DocumentResponseDto } from './dto/document-response.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { PrismaClient } from '@prisma/client';
import { OcrService } from '../ocr/ocr.service';

const prisma = new PrismaClient();

@Injectable()
export class DocumentsService {
  constructor(private readonly ocrService: OcrService) {}

  async create(createDto: CreateDocumentDto): Promise<DocumentResponseDto> {
    const text = await this.ocrService.recognize(createDto.file);
    const doc = await prisma.document.create({
      data: {
        fileUrl: '',
        ocrText: text,
      },
    });
    return this.toResponseDto(doc);
  }

  async findAll(): Promise<DocumentResponseDto[]> {
    const docs = await prisma.document.findMany();
    return docs.map((d) => this.toResponseDto(d));
  }

  private toResponseDto(doc: any): DocumentResponseDto {
    return {
      id: doc.id,
      fileUrl: doc.fileUrl,
      ocrText: doc.ocrText ?? undefined,
      createdAt: doc.createdAt,
    };
  }
}
