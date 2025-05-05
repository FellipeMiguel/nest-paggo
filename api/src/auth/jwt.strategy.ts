import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ExtractJwt } from 'passport-jwt';
import { JwtService } from '@nestjs/jwt';


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private jwtService: JwtService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.NEXTAUTH_SECRET,
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub || payload.id,
      email: payload.email,
      name: payload.name,
      image: payload.picture,
    };
  }
}

