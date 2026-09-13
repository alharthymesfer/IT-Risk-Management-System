import { ConfigService } from '@nestjs/config';
import { CookieOptions } from 'express';
import ms from 'ms';

export function buildAccessTokenCookieOptions(configService: ConfigService): CookieOptions {
  const expiresIn = configService.get<string>('JWT_EXPIRES_IN') ?? '8h';

  return {
    httpOnly: true,
    secure: configService.get<string>('COOKIE_SECURE') === 'true',
    sameSite: configService.get<string>('COOKIE_SECURE') === 'true' ? 'none' : 'lax',
    domain: configService.get<string>('COOKIE_DOMAIN'),
    path: '/',
    maxAge: ms(expiresIn),
  };
}
