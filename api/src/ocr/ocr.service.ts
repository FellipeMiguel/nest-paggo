import { Injectable } from '@nestjs/common';
import Tesseract from 'tesseract.js';

@Injectable()
export class OcrService {
  async recognize(base64: string): Promise<string> {
    const {
      data: { text },
    } = await Tesseract.recognize(base64, 'eng');
    return text;
  }
}
