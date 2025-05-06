import { Test, TestingModule } from '@nestjs/testing';
import { OcrService } from './ocr.service';
import { PrismaService } from '../prisma.service';
import { InternalServerErrorException } from '@nestjs/common';

describe('OcrService', () => {
  let ocrService: OcrService;
  let prismaService: PrismaService;

  // Define um mock para o worker do Tesseract
  const mockWorker = {
    load: jest.fn().mockResolvedValue(undefined),
    // Como o método load() é chamado tanto sem parâmetros quanto com 'por',
    // usamos a mesma função mock que aceita qualquer argumento.
    reinitialize: jest.fn().mockResolvedValue(undefined),
    recognize: jest.fn().mockResolvedValue({ data: { text: 'mock extracted text' } }),
    terminate: jest.fn().mockResolvedValue(undefined),
  };

  // Define um mock para o PrismaService
  const mockPrismaService = {
    user: {
      upsert: jest.fn().mockResolvedValue(undefined),
    },
    oCR: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OcrService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    ocrService = module.get<OcrService>(OcrService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Força a utilização do mockWorker sobrescrevendo a propriedade workerPromise
    // para que os métodos utilizados em initWorker e extractText sejam os mocks definidos.
    (ocrService as any).workerPromise = Promise.resolve(mockWorker);
  });

  describe('extractText', () => {
    it('should extract text successfully', async () => {
      const filePath = 'uploads/image.jpg';

      const result = await ocrService.extractText(filePath);

      expect(result).toBe('mock extracted text');
      // Como o método initWorker chama load() duas vezes (uma sem parâmetro e outra com 'por')
      expect(mockWorker.load).toHaveBeenCalledTimes(2);
      expect(mockWorker.reinitialize).toHaveBeenCalledWith('por');
      expect(mockWorker.recognize).toHaveBeenCalledWith(filePath);
      expect(mockWorker.terminate).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if worker.recognize fails', async () => {
      mockWorker.recognize.mockRejectedValueOnce(new Error('recognize error'));

      await expect(ocrService.extractText('uploads/image.jpg')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('saveResult', () => {
    const fileUrl = 'uploads/file.jpg';
    const text = 'extracted text';
    const userData = { userId: 'user-123', email: 'test@example.com', name: 'Test Document', image: 'http://example.com/image.png' };

    it('should save and return OCR record', async () => {
      const fakeOCRRecord = { id: 1, name: userData.name, fileUrl, text, userId: userData.userId };
      mockPrismaService.oCR.create.mockResolvedValue(fakeOCRRecord);

      const result = await ocrService.saveResult(fileUrl, text, userData);

      expect(mockPrismaService.user.upsert).toHaveBeenCalledWith({
        where: { id: userData.userId },
        update: {},
        create: {
          id: userData.userId,
          email: userData.email,
          name: userData.name,
          image: userData.image,
        },
      });
      expect(mockPrismaService.oCR.create).toHaveBeenCalledWith({
        data: {
          name: userData.name,
          fileUrl,
          text,
          userId: userData.userId,
        },
      });
      expect(result).toEqual(fakeOCRRecord);
    });

    it('should throw InternalServerErrorException if prisma.oCR.create fails', async () => {
      mockPrismaService.oCR.create.mockRejectedValueOnce(new Error('DB error'));

      await expect(ocrService.saveResult(fileUrl, text, userData)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('listAll', () => {
    it('should return paginated results', async () => {
      const userId = 'user-123';
      const pageNumber = 2;
      const itemsPerPage = 6;
      const totalCount = 12;
      const mockDocuments = [{ id: 1, name: 'Doc1' }, { id: 2, name: 'Doc2' }];

      mockPrismaService.oCR.count.mockResolvedValue(totalCount);
      mockPrismaService.oCR.findMany.mockResolvedValue(mockDocuments);

      const result = await ocrService.listAll(userId, pageNumber, itemsPerPage, 'searchTerm');

      expect(mockPrismaService.oCR.count).toHaveBeenCalledWith({
        where: { userId, name: { contains: 'searchTerm', mode: 'insensitive' } },
      });
      expect(mockPrismaService.oCR.findMany).toHaveBeenCalledWith({
        where: { userId, name: { contains: 'searchTerm', mode: 'insensitive' } },
        orderBy: { createdAt: 'desc' },
        skip: (pageNumber - 1) * itemsPerPage,
        take: itemsPerPage,
      });
      expect(result).toEqual({
        documents: mockDocuments,
        totalPages: Math.ceil(totalCount / itemsPerPage),
        currentPage: pageNumber,
      });
    });

    it('should throw InternalServerErrorException on error', async () => {
      mockPrismaService.oCR.count.mockRejectedValueOnce(new Error('error'));

      await expect(ocrService.listAll('user-123')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findById', () => {
    it('should return the document record from prisma.oCR.findFirst', async () => {
      const userId = 'user-123';
      const id = 1;
      const fakeRecord = { id, name: 'Doc1' };

      mockPrismaService.oCR.findFirst.mockResolvedValue(fakeRecord);

      const result = await ocrService.findById(id, userId);

      expect(mockPrismaService.oCR.findFirst).toHaveBeenCalledWith({
        where: { id, userId },
      });
      expect(result).toEqual(fakeRecord);
    });
  });
});