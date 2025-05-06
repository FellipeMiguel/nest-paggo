import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ExtractJwt } from 'passport-jwt';
import { JwtService } from '@nestjs/jwt';

/**
 * JwtStrategy é responsável por validar os tokens JWT usados para autenticação.
 *
 * Ele extrai o token da autorização no cabeçalho (Bearer token) e, após a validação,
 * retorna as informações do usuário contidas no payload do token.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private jwtService: JwtService) {
    super({
      // Extrai o JWT do cabeçalho Authorization com o formato Bearer token
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Define a chave secreta para validação do token
      secretOrKey: process.env.NEXTAUTH_SECRET,
    });
  }

  /**
   * Método responsável por validar e decodificar o payload do token JWT.
   *
   * Esse método é chamado automaticamente após a verificação do token pelo Passport.
   *
   * @param payload - O objeto decodificado do token JWT, contendo as informações do usuário.
   * @returns Um objeto com as propriedades do usuário que serão anexadas à requisição.
   *
   * Nota: O campo `userId` pode ser encontrado em `payload.sub` ou `payload.id`.
   */
  async validate(payload: any) {
    return {
      userId: payload.sub || payload.id,
      email: payload.email,
      name: payload.name,
      image: payload.picture,
    };
  }
}