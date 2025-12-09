import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

// Centralized helper so signing and validation always share the exact same secret/algorithm.
export const resolveJwtConfig = (
  configService: ConfigService,
): JwtModuleOptions => {
  const secret = configService.get<string>('JWT_SECRET') || 'dev-secret';
  return {
    secret,
    signOptions: {
      expiresIn: '7d',
    },
  };
};
