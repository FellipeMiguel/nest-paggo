import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import Tesseract from 'tesseract.js';

@Injectable()
export class OcrService {
  constructor(private prisma: PrismaService) {}

  async extractText(filePath: string): Promise<string> {
    // Extrai texto da imagem usando Tesseract.js (biblioteca OCR):contentReference[oaicite:6]{index=6}
    const {
      data: { text },
    } = await Tesseract.recognize(filePath, 'por');
    return text;
  }

  async saveResult(fileUrl: string, text: string) {
    // Salva o resultado no banco (Prisma)
    return this.prisma.oCR.create({
      data: {
        fileUrl,
        text,
      },
    });
  }
}
