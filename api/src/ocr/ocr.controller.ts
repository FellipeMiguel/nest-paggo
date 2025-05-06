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
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { OcrService } from './ocr.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExplainDto } from './dto/explain.dto';
import { LlmService } from '../llm/llm.service';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    name: string;
    image: string;
  };
}

@ApiTags('OCR')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
          cb(null, `ocr-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`);
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
  @ApiOperation({ summary: 'Fazer upload de um documento para processamento OCR.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Dados para o upload do documento',
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Nome do Documento',
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Arquivo da imagem (JPG, JPEG ou PNG)',
        },
      },
      required: ['name', 'file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Documento processado com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou arquivo não permitido.',
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('name') documentName: string,
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
      name: documentName,
      image: user.image,
    });

    return result;
  }

  @Get('list')
  @ApiOperation({ summary: 'Listar documentos processados com paginação e pesquisa.' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número da página (padrão: 1)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Termo para busca no nome ou conteúdo do documento',
  })
  @ApiResponse({
    status: 200,
    description: 'Retorna a lista de documentos.',
  })
  async listAll(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('search') search?: string,
  ) {
    const userId = req.user.userId;
    const itemsPerPage = 6;
    const pageNumber = page ? parseInt(page, 10) : 1;

    return this.ocrService.listAll(userId, pageNumber, itemsPerPage, search);
  }

  @Post('explain')
  @ApiOperation({ summary: 'Obter explicação interativa sobre o conteúdo de um documento usando LLM.' })
  @ApiBody({
    type: ExplainDto,
    description: 'Objeto contendo o id do documento e a query para explicação.',
  })
  @ApiResponse({
    status: 200,
    description: 'Retorna a explicação gerada pelo LLM.',
  })
  @ApiResponse({
    status: 404,
    description: 'Documento não encontrado.',
  })
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