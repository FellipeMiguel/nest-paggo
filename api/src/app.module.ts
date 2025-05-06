import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { PrismaService } from './prisma.service';
import { LlmService } from './llm/llm.service';
import { OcrService } from './ocr/ocr.service';
import { OcrController } from './ocr/ocr.controller';

import { JwtStrategy } from './auth/jwt.strategy';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

/**
 * AppModule é o módulo raiz da aplicação.
 * 
 * Ele importa e configura os módulos essenciais:
 * - ConfigModule: Garante que as variáveis de ambiente sejam acessíveis globalmente.
 * - PassportModule: Configura o mecanismo de autenticação, definindo o JWT como estratégia padrão.
 * - JwtModule: Configura o JWT para autenticação, utilizando a variável de ambiente NEXTAUTH_SECRET e definindo o tempo de expiração.
 *
 * Além disso, declara o Controller responsável pela rota 'ocr' (OcrController) e
 * os Providers: Serviços para interação com o banco de dados (PrismaService),
 * serviços de OCR, LLM e autenticação.
 */
@Module({
  imports: [
    // ConfigModule disponibiliza as variáveis de ambiente globalmente.
    ConfigModule.forRoot({ isGlobal: true }),
    // PassportModule com a estratégia JWT como padrão para autenticação.
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // JwtModule configura a chave secreta e o tempo de expiração do token.
    JwtModule.register({
      secret: process.env.NEXTAUTH_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  // Controllers expõem os endpoints da aplicação.
  controllers: [OcrController],
  // Providers registram os serviços e estratégias de autenticação que serão injetados nas classes.
  providers: [
    PrismaService,
    LlmService,
    OcrService,
    JwtStrategy,
    JwtAuthGuard,
  ],
  // Permite que o JwtAuthGuard seja utilizado em outros módulos se necessário.
  exports: [JwtAuthGuard],
})
export class AppModule {}