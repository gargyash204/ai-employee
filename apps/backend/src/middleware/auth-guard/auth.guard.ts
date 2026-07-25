import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.signedCookies?.auth_token as string | undefined;

    if (token !== 'authenticated') {
      throw new UnauthorizedException();
    }

    return true;
  }
}
