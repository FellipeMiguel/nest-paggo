import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // ativa CORS (padrão: aceita todas as origens):contentReference[oaicite:4]{index=4}
  await app.listen(3001);
}
bootstrap();
