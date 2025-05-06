import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { createWorker } from 'tesseract.js';
import { PrismaService } from '../prisma.service';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  // Instancia um worker Tesseract. Note que usamos uma Promise para manter
  // a lógica de inicialização do worker.
  private workerPromise = createWorker();

  constructor(private prisma: PrismaService) {}

  /**
   * Inicializa o worker do Tesseract para o idioma português.
   *
   * Esse método garante que o worker esteja carregado e reconfigurado para
   * processar documentos em português. Em caso de falha, dispara uma exceção.
   *
   * @throws {InternalServerErrorException} Se ocorrer algum erro na inicialização.
   */
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

  /**
   * Extrai texto de uma imagem utilizando o Tesseract.
   *
   * @param path - Caminho do arquivo de imagem a ser processado.
   * @returns Uma Promise que resolve para o texto extraído.
   *
   * @throws {InternalServerErrorException} Se ocorrer algum erro durante a extração.
   */
  async extractText(path: string): Promise<string> {
    try {
      await this.initWorker();
      const worker = await this.workerPromise;
      const result = await worker.recognize(path);
      const { text } = result.data;
      // Após o processamento, finaliza o worker para liberar recursos.
      await worker.terminate();
      return text;
    } catch (err) {
      this.logger.error(`Falha ao extrair texto de ${path}`, err);
      throw new InternalServerErrorException('Erro ao extrair texto do documento');
    }
  }

  /**
   * Salva o resultado do processamento OCR no banco de dados.
   *
   * Este método realiza duas operações:
   * 1. Atualiza ou cria o usuário no banco de dados utilizando o Prisma.
   * 2. Cria um registro do documento processado, armazenando o caminho do arquivo,
   *    o texto extraído e associando ao usuário.
   *
   * @param fileUrl - URL ou caminho do arquivo da imagem.
   * @param text - Texto extraído pelo OCR.
   * @param user - Objeto contendo informações do usuário (userId, email, nome e imagem).
   * @returns O registro do documento salvo.
   *
   * @throws {InternalServerErrorException} Se houver falha na operação de banco de dados.
   */
  async saveResult(
    fileUrl: string,
    text: string,
    user: { userId: string; email: string; name?: string; image?: string },
  ) {
    const { userId, email, name, image } = user;

    // Atualiza ou cria o usuário caso não exista.
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

  /**
   * Lista os documentos processados para um usuário, com suporte à paginação e busca.
   *
   * @param userId - Identificador do usuário.
   * @param pageNumber - Número da página de resultados (padrão: 1).
   * @param itemsPerPage - Quantidade de itens por página (padrão: 6).
   * @param search - Texto para filtrar os documentos pelo nome (opcional).
   * @returns Um objeto contendo os documentos, a página atual e o total de páginas.
   *
   * @throws {InternalServerErrorException} Se ocorrer qualquer erro na listagem.
   */
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

      const totalCount = await this.prisma.oCR.count({ where: whereClause });

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
      throw new InternalServerErrorException('Erro ao carregar documentos paginados.');
    }
  }

  /**
   * Busca um documento específico associado a um usuário.
   *
   * @param id - Identificador do documento.
   * @param userId - Identificador do usuário.
   * @returns O registro do documento, ou null caso não seja encontrado.
   */
  findById(id: number, userId: string) {
    return this.prisma.oCR.findFirst({
      where: { id, userId },
    });
  }
}