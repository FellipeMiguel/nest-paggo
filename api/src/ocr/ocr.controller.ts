import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Get,
  Body,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { OcrService } from './ocr.service';
import { LlmService } from '../llm/llm.service';
import { ExplainDto } from './dto/explain.dto';

import { Express } from 'express';

@Controller('ocr')
export class OcrController {
  private readonly logger = new Logger(OcrController.name);
  constructor(
    private ocrService: OcrService,
    private llm: LlmService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const name = `ocr-${Date.now()}-${Math.round(Math.random() * 1e9)}.${file.originalname.split('.').pop()}`;
          cb(null, name);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          console.warn(`Rejected file type: ${file?.mimetype || 'unknown'}`);
          return cb(
            new BadRequestException('Apenas JPG, JPEG ou PNG são permitidos'),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      this.logger.error('Nenhum arquivo enviado');
      throw new BadRequestException('Envie um arquivo para processamento');
    }
    try {
      const text = await this.ocrService.extractText(file.path);
      const record = await this.ocrService.saveResult(file.path, text);
      return record;
    } catch (error) {
      this.logger.error('Erro ao processar upload', error);
      throw new InternalServerErrorException(
        'Falha ao processar o arquivo. Tente novamente.',
      );
    }
  }

  @Get('list')
  async listAll() {
    try {
      return await this.ocrService.listAll();
    } catch (error) {
      this.logger.error('Erro ao listar documentos', error);
      throw new InternalServerErrorException(
        'Não foi possível listar documentos',
      );
    }
  }

  @Post('explain')
  async explain(@Body(new ValidationPipe()) explainDto: ExplainDto) {
    this.logger.log(
      `Dados recebidos após validação: ${JSON.stringify(explainDto)}`,
    );
    const { id, query } = explainDto;

    try {
      const record = await this.ocrService.findById(id);
      if (!record) {
        this.logger.warn(`Documento não encontrado: ID ${id}`);
        throw new NotFoundException('Documento não encontrado');
      }
      const explanation = await this.llm.explain(record.text, query);
      return { explanation };
    } catch (error) {
      this.logger.error('Erro ao gerar explicação', error);
      throw error instanceof NotFoundException
        ? error
        : new InternalServerErrorException('Erro ao gerar explicação');
    }
  }
}
