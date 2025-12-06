import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly configService: ConfigService) {
    const secret =
      configService.get<string>('JWT_SECRET') || 'dev-secret';
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });

    console.log('DEBUG JwtStrategy constructed, secret =', secret);
  }

  async validate(payload: any) {
    console.log('DEBUG JwtStrategy.validate payload =', payload);
    return {
      userId: payload.userId ?? payload.sub,
      email: payload.email,
    };
  }
}
