import { ConfigService } from '@nestjs/config';
import { buildAccessTokenCookieOptions } from './cookie-options';

describe('buildAccessTokenCookieOptions', () => {
  const configFor = (values: Record<string, string>) =>
    ({ get: (key: string) => values[key] }) as unknown as ConfigService;

  it('builds httpOnly/secure/sameSite=none options with maxAge derived from JWT_EXPIRES_IN', () => {
    const options = buildAccessTokenCookieOptions(
      configFor({ JWT_EXPIRES_IN: '8h', COOKIE_SECURE: 'true', COOKIE_DOMAIN: 'example.com' }),
    );

    expect(options).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: 'example.com',
      path: '/',
      maxAge: 8 * 60 * 60 * 1000,
    });
  });

  it('defaults secure to false when COOKIE_SECURE is not the string "true"', () => {
    const options = buildAccessTokenCookieOptions(configFor({ JWT_EXPIRES_IN: '8h' }));

    expect(options.secure).toBe(false);
  });

  it('falls back to an 8h maxAge when JWT_EXPIRES_IN is unset', () => {
    const options = buildAccessTokenCookieOptions(configFor({}));

    expect(options.maxAge).toBe(8 * 60 * 60 * 1000);
  });
});
