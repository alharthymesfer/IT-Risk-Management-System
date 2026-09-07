import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser, toSafeUser } from '../common/types/safe-user';
import { JwtPayload } from './types/jwt-payload.interface';

// A precomputed bcrypt hash with no corresponding real password. Compared against
// on every failed lookup (unknown email / inactive user) so those requests take
// roughly the same time as a real wrong-password attempt — otherwise the "no
// bcrypt call" path is measurably faster and lets an attacker enumerate valid
// emails purely from response timing, even though the error message is generic.
const DUMMY_PASSWORD_HASH = '$2a$12$m0Vof4ZoHZRdDMoKyxEOFurC56iygOwJcj2hhHgMspVNzK6X37Zeu';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    const passwordMatches = await bcrypt.compare(
      password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !user.isActive || !passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(user: User): Promise<{ accessToken: string; user: SafeUser }> {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken, user: toSafeUser(user) };
  }
}
