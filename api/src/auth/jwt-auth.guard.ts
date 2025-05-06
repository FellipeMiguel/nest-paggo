import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtAuthGuard é um guard que protege endpoints usando a estratégia de autenticação JWT.
 *
 * Ele estende o AuthGuard do Passport configurado com a estratégia 'jwt', 
 * verificando se o token JWT presente no cabeçalho da requisição é válido.
 * Caso o token seja inválido ou ausente, o acesso à rota protegida será negado.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}