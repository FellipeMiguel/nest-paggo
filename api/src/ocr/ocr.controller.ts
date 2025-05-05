import {
  Controller,
  Post,
  Get,
  Body,
  UploadedFile,
  UseInterceptors,
  Req,
  BadRequestException,
  InternalServerErrorException,
  UseGuards,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { OcrService } from './ocr.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExplainDto } from './dto/explain.dto';
import { LlmService } from '../llm/llm.service';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    name: string;
    image: string;
  };
}

@UseGuards(JwtAuthGuard) // Aplica o guard a todos os endpoints deste controller
@Controller('ocr')
export class OcrController {
  constructor(
    private readonly ocrService: OcrService,
    private readonly llm: LlmService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const ext = file.originalname.split('.').pop();
          cb(
            null,
            `ocr-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`,
          );
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
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
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    if (!user) {
      throw new InternalServerErrorException('Usuário não autenticado.');
    }

    const text = await this.ocrService.extractText(file.path);
    const fileUrl = file.path;

    const result = await this.ocrService.saveResult(fileUrl, text, {
      userId: user.userId,
      email: user.email,
      name: user.name,
      image: user.image,
    });

    return result;
  }

  @Get('list')
  async listAll(@Req() req: AuthenticatedRequest) {
    const userId = req.user.userId;
    return this.ocrService.listAll(userId);
  }

  @Post('explain')
  async explain(
    @Body(new ValidationPipe({ transform: true })) explainDto: ExplainDto,
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