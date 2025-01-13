import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

@Injectable()
export class AtGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    return (await super.canActivate(context)) as boolean;
  }

  handleRequest(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
  ): any {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    if (info?.name === 'TokenExpiredError') {
      const refreshToken = request?.cookies?.['refresh_token'];
      if (!refreshToken) {
        throw new UnauthorizedException('Refresh token missing');
      }

      try {
        const refreshedUser = this.refreshTokensSync(response, refreshToken);
        return refreshedUser;
      } catch (refreshErr) {
        throw new UnauthorizedException('Token refresh failed');
      }
    }

    if (err || !user) {
      throw err || new UnauthorizedException();
    }

    return user;
  }

  refreshTokensSync(response: Response, refreshToken: string): any {
    try {
      const { accessToken, user } = this.getTokens(refreshToken);

      response.cookie('access_token', accessToken);
      response.cookie('name', 'ANUJJBAAN');

      return user;
    } catch (err) {
      throw new UnauthorizedException('Could not refresh tokens');
    }
  }

  getTokens(refreshToken: string) {
    try {
      const decodedRefreshToken = jwt.verify(
        refreshToken,
        process.env.RT_SECRET,
      );

      if (decodedRefreshToken?.sub) {
        const jwtPayload = {
          sub: decodedRefreshToken.sub,
        };

        const accessToken = jwt.sign(jwtPayload, process.env.AT_SECRET, {
          expiresIn: '15m',
        });

        return {
          accessToken,
          user: jwtPayload,
        };
      } else {
        throw new UnauthorizedException('Invalid refresh token');
      }
    } catch (error) {
      throw new UnauthorizedException('Token verification failed');
    }
  }
}
