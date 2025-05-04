import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as Tesseract from 'tesseract.js';
@Injectable()
export class OcrService {
  constructor(private prisma: PrismaService) {}

  async extractText(filePath: string): Promise<string> {
    // Extrai texto da imagem usando Tesseract.js
    try {
      const {
        data: { text },
      } = await Tesseract.recognize(filePath, 'por');
      return text;
    } catch (error: unknown) {
      console.error('Erro ao usar Tesseract:', error);
      if (error instanceof Error) {
        throw new Error(`Erro ao processar OCR: ${error.message}`);
      }
      throw new Error('Erro ao processar OCR: Erro desconhecido');
    }
  }

  async saveResult(fileUrl: string, text: string) {
    try {
      return await this.prisma.oCR.create({
        data: {
          fileUrl,
          text,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Erro ao salvar no banco de dados: ${error.message}`);
      }
      throw new Error('Erro ao salvar no banco de dados: Erro desconhecido');
    }
  }
}
