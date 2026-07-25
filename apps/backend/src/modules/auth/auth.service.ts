import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly config: ConfigService) {}

  login(username: string, password: string): void {
    const expectedUsername = this.config.get<string>('APP_USERNAME');
    const expectedPassword = this.config.get<string>('APP_PASSWORD');

    if (
      !expectedUsername ||
      !expectedPassword ||
      username !== expectedUsername ||
      password !== expectedPassword
    ) {
      this.logger.warn(`Failed login attempt for user: ${username}`);
      throw new UnauthorizedException('Invalid credentials');
    }
  }
}
