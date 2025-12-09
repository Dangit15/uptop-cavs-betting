import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { resolveJwtConfig } from './jwt.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly configService: ConfigService) {
    const { secret } = resolveJwtConfig(configService);
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });

    console.log('DEBUG JwtStrategy constructed, secret =', secret);
  }

  async validate(payload: any) {
    console.log('DEBUG JwtStrategy.validate payload =', payload);
    const userId = payload.userId ?? payload.sub;
    return {
      userId,
      id: userId,
      sub: payload.sub,
      email: payload.email,
    };
  }
}
