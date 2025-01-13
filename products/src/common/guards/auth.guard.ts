import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

import argon from 'argon2';
import { Request } from 'express';
import { Observable } from 'rxjs';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    const request = context.switchToHttp().getRequest();
    return this.validateRequest(request);
  }

  async validateRequest(request: Request) {
    console.log('1st Guard');

    try {
      const refreshToken = request?.cookies?.['refresh_token'];

      if (refreshToken) {
        const decodedToken = this.jwtService.verify(refreshToken, {
          secret: process.env.RT_SECRET,
          ignoreExpiration: false,
        });
        if (decodedToken.sub) {
          const userId = decodedToken.sub;
          const user = await this.prisma.users.findUnique({
            where: {
              referenceId: userId,
            },
          });

          if (user) {
            const rtMatches = await argon.verify(user.hashedRt, refreshToken);
            if (rtMatches) {
              request.validRefreshToken = true;
              return true;
            }
          }
        }
      }
    } catch (error) {
      console.log('AUTH_GUARD ERROR:', error);
    }

    return false;
  }
}
