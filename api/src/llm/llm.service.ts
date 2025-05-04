import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InferenceClient } from '@huggingface/inference';

@Injectable()
export class LlmService {
  private hf = new InferenceClient(process.env.HUGGINGFACE_API_TOKEN);

  async explain(text: string, query: string): Promise<string> {
    try {
      const prompt = `Texto extraído: ${text}\nExplique: ${query}`;
      const resp = await this.hf.textGeneration({
        model: 'google/flan-t5-small',
        inputs: prompt,
        parameters: { max_new_tokens: 200 },
      });

      if (
        Array.isArray(resp) &&
        resp[0] &&
        typeof (resp[0] as { generated_text: string }).generated_text ===
          'string'
      ) {
        return (resp[0] as { generated_text: string }).generated_text;
      } else if (
        !Array.isArray(resp) &&
        typeof (resp as { generated_text: string }).generated_text === 'string'
      ) {
        return (resp as { generated_text: string }).generated_text;
      } else {
        throw new InternalServerErrorException(
          'Unexpected response format from LLM',
        );
      }
    } catch (err) {
      throw new InternalServerErrorException('Erro LLM', String(err));
    }
  }
}
