import { Test, TestingModule } from '@nestjs/testing';
import { OcrController } from './ocr.controller';
import { OcrService } from './ocr.service';
import { LlmService } from '../llm/llm.service';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ExplainDto } from './dto/explain.dto';

describe('OcrController', () => {
  let ocrController: OcrController;
  let ocrService: OcrService;
  let llmService: LlmService;

  // Mock de um request autenticado, contendo as informações do usuário
  const mockRequest = {
    user: {
      userId: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      image: 'http://example.com/image.png',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OcrController],
      providers: [
        {
          provide: OcrService,
          useValue: {
            extractText: jest.fn(),
            saveResult: jest.fn(),
            listAll: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: LlmService,
          useValue: {
            explain: jest.fn(),
          },
        },
      ],
    }).compile();

    ocrController = module.get<OcrController>(OcrController);
    ocrService = module.get<OcrService>(OcrService);
    llmService = module.get<LlmService>(LlmService);
  });

  describe('uploadFile', () => {
    // Simula um objeto do tipo Express.Multer.File
    const fakeFile = {
      path: '/uploads/fake-file.jpg',
      originalname: 'fake-file.jpg',
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    it('should throw an error if user is not authenticated', async () => {
      // Passa um objeto de request sem a propriedade user
      await expect(
        ocrController.uploadFile(fakeFile, 'Document Name', {} as any)
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should upload file and return result', async () => {
      const fakeText = 'Extracted text from image';
      const fakeResult = {
        id: 1,
        name: 'Document Name',
        fileUrl: fakeFile.path,
        text: fakeText,
        userId: mockRequest.user.userId,
      };

      // Simula a extração de texto e salvamento do resultado
      (ocrService.extractText as jest.Mock).mockResolvedValue(fakeText);
      (ocrService.saveResult as jest.Mock).mockResolvedValue(fakeResult);

      const result = await ocrController.uploadFile(
        fakeFile,
        'Document Name',
        mockRequest as any
      );

      expect(ocrService.extractText).toHaveBeenCalledWith(fakeFile.path);
      expect(ocrService.saveResult).toHaveBeenCalledWith(fakeFile.path, fakeText, {
        userId: mockRequest.user.userId,
        email: mockRequest.user.email,
        name: 'Document Name',
        image: mockRequest.user.image,
      });
      expect(result).toEqual(fakeResult);
    });
  });

  describe('listAll', () => {
    it('should return a list of documents with pagination', async () => {
      const fakeDocuments = {
        documents: [{ id: 1, name: 'Doc 1' }],
        totalPages: 2,
        currentPage: 1,
      };

      (ocrService.listAll as jest.Mock).mockResolvedValue(fakeDocuments);

      const pageQuery = '1';
      const searchQuery = 'Doc';
      const result = await ocrController.listAll(
        mockRequest as any,
        pageQuery,
        searchQuery
      );

      expect(ocrService.listAll).toHaveBeenCalledWith(
        mockRequest.user.userId,
        parseInt(pageQuery, 10),
        6,
        searchQuery
      );
      expect(result).toEqual(fakeDocuments);
    });
  });

  describe('explain', () => {
    it('should throw NotFoundException if document is not found', async () => {
      const explainDto: ExplainDto = { id: 1, query: 'Explain?' };

      // Simula que o documento não foi encontrado
      (ocrService.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        ocrController.explain(explainDto, mockRequest as any)
      ).rejects.toThrow(NotFoundException);
    });

    it('should return explanation when document is found', async () => {
      const explainDto: ExplainDto = { id: 1, query: 'Explain?' };
      const record = {
        id: 1,
        text: 'Some extracted text',
        userId: mockRequest.user.userId,
      };
      const fakeExplanation = 'This is the explanation';

      (ocrService.findById as jest.Mock).mockResolvedValue(record);
      (llmService.explain as jest.Mock).mockResolvedValue(fakeExplanation);

      const result = await ocrController.explain(
        explainDto,
        mockRequest as any
      );

      expect(ocrService.findById).toHaveBeenCalledWith(
        explainDto.id,
        mockRequest.user.userId
      );
      expect(llmService.explain).toHaveBeenCalledWith(
        record.text,
        explainDto.query
      );
      expect(result).toEqual({ explanation: fakeExplanation });
    });
  });
});