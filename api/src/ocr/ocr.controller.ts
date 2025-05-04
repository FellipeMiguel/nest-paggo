import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { OcrService } from './ocr.service';
import { Express } from 'express';

@Controller('ocr')
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const fileExt = file.originalname.split('.').pop();
          cb(null, `ocr-${uniqueSuffix}.${fileExt}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Permite apenas imagens JPEG/PNG
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          return cb(
            new BadRequestException('Tipo de arquivo não suportado'),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // limite 5MB
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Arquivo não foi enviado');
    }
    try {
      const filePath = file.path; // caminho real do arquivo salvo
      const text = await this.ocrService.extractText(filePath);
      const record = await this.ocrService.saveResult(filePath, text);
      return {
        id: record.id,
        fileUrl: record.fileUrl,
        text: record.text,
        createdAt: record.createdAt,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(`Erro interno: ${error.message}`);
      }
      throw new BadRequestException('Erro interno desconhecido');
    }
  }
}
