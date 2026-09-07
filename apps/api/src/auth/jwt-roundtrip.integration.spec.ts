import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { JwtPayload } from './types/jwt-payload.interface';

// Exercises the real @nestjs/jwt (jsonwebtoken) sign/verify path — no mocks — using the
// same secret/expiry shape AuthModule wires from JWT_SECRET / JWT_EXPIRES_IN. This is the
// one auth behavior that can be fully verified end-to-end without a live PostgreSQL instance.
describe('JWT sign/verify round trip (real @nestjs/jwt, no mocks)', () => {
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-secret-for-round-trip',
          signOptions: { expiresIn: '8h' },
        }),
      ],
    }).compile();

    jwtService = module.get(JwtService);
  });

  it('signs a payload and verifies it back with an ~8h expiry', async () => {
    const payload: JwtPayload = { sub: 'user-1', email: 'admin@acme.test', role: Role.ADMIN };

    const token = await jwtService.signAsync(payload);
    const decoded = await jwtService.verifyAsync<JwtPayload & { iat: number; exp: number }>(
      token,
    );

    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.exp - decoded.iat).toBe(8 * 60 * 60);
  });

  it('rejects a token signed with a different secret', async () => {
    const otherModule: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'wrong-secret', signOptions: { expiresIn: '8h' } })],
    }).compile();
    const otherJwtService = otherModule.get(JwtService);

    const token = await otherJwtService.signAsync({ sub: 'user-1' });

    await expect(jwtService.verifyAsync(token)).rejects.toThrow();
  });
});
