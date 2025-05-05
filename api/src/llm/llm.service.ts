import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class LlmService {
  private openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  async explain(text: string, query: string): Promise<string> {
    const prompt = `Texto extraído:\n"""${text}"""\n\nExplique o seguinte: ${query}`;

    // Cast para satisfazer o tipo esperado sem precisar do 'name' das function messages
    const messages = [
      {
        role: 'system',
        content:
          'Você é um assistente experiente em explicar textos extraídos por OCR.',
      },
      { role: 'user', content: prompt },
    ] as unknown as Parameters<
      OpenAI['chat']['completions']['create']
    >[0]['messages'];

    try {
      const resp = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 300,
        temperature: 0.7,
      });

      const answer = resp.choices?.[0]?.message?.content;
      if (!answer) {
        console.error('Resposta inesperada da OpenAI:', resp);
        throw new HttpException(
          'Formato inesperado de resposta da LLM',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      return answer.trim();
    } catch (err: any) {
      // Trate cota excedida
      if (err.code === 'insufficient_quota' || err.status === 429) {
        throw new HttpException(
          {
            message:
              'Limite de cota excedido na OpenAI. Verifique seu plano/billing.',
            original: err.message,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      console.error('Erro ao chamar OpenAI:', err);
      throw new HttpException('Erro LLM', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
