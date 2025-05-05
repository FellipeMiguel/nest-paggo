import {
  Controller,
  Post,
  Get,
  UploadedFile,
  UseInterceptors,
  Req,
  Body,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Express } from 'express';

import { OcrService } from './ocr.service';
import { LlmService } from '../llm/llm.service';
import { ExplainDto } from './dto/explain.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthenticatedRequest extends Express.Request {
  user: {
    userId: string;
    email: string;
    name?: string;
    image?: string;
  };
}

@Controller('ocr')
@UseGuards(JwtAuthGuard)
export class OcrController {
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
          const ext = file.originalname.split('.').pop();
          cb(null, `ocr-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          return cb(new BadRequestException('Apenas JPG, JPEG ou PNG são permitidos'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!file) {
      throw new BadRequestException('Envie um arquivo para processamento');
    }
    // extrai user completo
    const { userId, email, name, image } = req.user;
  
    const text = await this.ocrService.extractText(file.path);
    const record = await this.ocrService.saveResult(
      file.path,
      text,
      { userId, email, name, image },
    );
    return record;
  }
  

  @Get('list')
  async listAll(@Req() req: AuthenticatedRequest) {
    const userId = req.user.userId;
    return this.ocrService.listAll(userId);
  }

  @Post('explain')
  async explain(
    @Body(new ValidationPipe()) explainDto: ExplainDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.userId;
    const record = await this.ocrService.findById(explainDto.id, userId);
    if (!record) {
      throw new NotFoundException('Documento não encontrado');
    }
    const explanation = await this.llm.explain(record.text, explainDto.query);
    return { explanation };
  }
}
