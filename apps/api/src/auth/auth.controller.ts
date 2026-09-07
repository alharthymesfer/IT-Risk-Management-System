import { Body, Controller, Get, HttpCode, Post, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { User } from '@prisma/client';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { buildAccessTokenCookieOptions } from './cookie-options';
import { ACCESS_TOKEN_COOKIE } from './constants';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { toSafeUser } from '../common/types/safe-user';
import type { SafeUser } from '../common/types/safe-user';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  async login(
    // Unused: LocalAuthGuard (Passport) already extracted and authenticated
    // email/password from the body via LocalStrategy before this pipe runs.
    // Declaring it here is what makes Nest's global ValidationPipe apply
    // LoginDto's rules to the request body.
    @Body() _dto: LoginDto,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SafeUser> {
    const { accessToken, user: safeUser } = await this.authService.login(user);
    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, buildAccessTokenCookieOptions(this.configService));
    return safeUser;
  }

  @Public()
  @HttpCode(200)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response): { success: true } {
    res.clearCookie(ACCESS_TOKEN_COOKIE, buildAccessTokenCookieOptions(this.configService));
    return { success: true };
  }

  @Get('me')
  me(@CurrentUser() user: User): SafeUser {
    return toSafeUser(user);
  }
}
