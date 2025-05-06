import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { createWorker } from 'tesseract.js';
import { PrismaService } from '../prisma.service';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private workerPromise = createWorker();

  constructor(private prisma: PrismaService) {}

  private async initWorker() {
    try {
      const worker = await this.workerPromise;
      await worker.load();
      await worker.load('por');
      await worker.reinitialize('por');
    } catch (err) {
      this.logger.error('Falha ao inicializar worker Tesseract', err);
      throw new InternalServerErrorException('Erro interno de OCR');
    }
  }

  async extractText(path: string): Promise<string> {
    try {
      await this.initWorker();
      const worker = await this.workerPromise;
      const result = await worker.recognize(path);
      const { text } = result.data;
      await worker.terminate();
      return text;
    } catch (err) {
      this.logger.error(`Falha ao extrair texto de ${path}`, err);
      throw new InternalServerErrorException(
        'Erro ao extrair texto do documento',
      );
    }
  }

  async saveResult(
    fileUrl: string,
    text: string,
    user: { userId: string; email: string; name?: string; image?: string },
  ) {
    const { userId, email, name, image } = user;

    await this.prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email,
        name: name ?? null,
        image: image ?? null,
      },
    });

    try {
      return await this.prisma.oCR.create({
        data: {
          name,
          fileUrl,
          text,
          userId,
        },
      });
    } catch (err) {
      this.logger.error('Erro ao salvar resultado no DB', err);
      throw new InternalServerErrorException('Erro ao salvar resultado');
    }
  }

  async listAll(
    userId: string,
    pageNumber: number = 1,
    itemsPerPage: number = 6,
    search?: string,
  ) {
    try {
      const whereClause: any = { userId };
      if (search) {
        whereClause.name = {
          contains: search,
          mode: 'insensitive',
        };
      }

      const totalCount = await this.prisma.oCR.count({
        where: whereClause,
      });

      const documents = await this.prisma.oCR.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: (pageNumber - 1) * itemsPerPage,
        take: itemsPerPage,
      });

      return {
        documents,
        totalPages: Math.ceil(totalCount / itemsPerPage),
        currentPage: pageNumber,
      };
    } catch (err) {
      this.logger.error('Falha na listagem paginada de documentos', err);
      throw new InternalServerErrorException(
        'Erro ao carregar documentos paginados.',
      );
    }
  }

  findById(id: number, userId: string) {
    return this.prisma.oCR.findFirst({
      where: { id, userId },
    });
  }
}