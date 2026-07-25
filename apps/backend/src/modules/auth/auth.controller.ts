import {
  Body,
  Controller,
  Get,
  Post,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { Auth } from '../../middleware/auth-guard/auth.decorator';
import { LoginDto } from './auth.dto';
import { AuthService } from './auth.service';

const COOKIE_NAME = 'auth_token';
const COOKIE_VALUE = 'authenticated';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('login')
  login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.authService.login(body.username, body.password);

    res.cookie(COOKIE_NAME, COOKIE_VALUE, {
      httpOnly: true,
      signed: true,
      sameSite: 'lax',
      secure: this.config.get<string>('NODE_ENV') === 'production',
      maxAge: ONE_DAY_MS,
    });

    return {
      success: true,
      message: 'Login successful',
    };
  }

  @Auth()
  @Get('me')
  me() {
    return {
      success: true,
      data: {
        authenticated: true,
      },
    };
  }

  @Auth()
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      signed: true,
      sameSite: 'lax',
      secure: this.config.get<string>('NODE_ENV') === 'production',
    });

    return {
      success: true,
      message: 'Logged out',
    };
  }
}
