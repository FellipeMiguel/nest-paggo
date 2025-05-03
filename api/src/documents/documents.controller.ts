import { Controller, Post, Body, Get } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentResponseDto } from './dto/document-response.dto';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly docsService: DocumentsService) {}

  @Post('upload')
  async upload(
    @Body() createDto: CreateDocumentDto,
  ): Promise<DocumentResponseDto> {
    return this.docsService.create(createDto);
  }

  @Get()
  async findAll(): Promise<DocumentResponseDto[]> {
    return this.docsService.findAll();
  }
}
