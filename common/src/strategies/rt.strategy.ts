import { ForbiddenException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { JwtPayload } from '../types/jwtPayload.type';
import { JwtPayloadWithRt } from '../types/jwtPayloadWithRt.type';

@Injectable()
export class RtStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // Retrieve the refresh token from cookies
          return request?.cookies?.['refresh_token'] || null;
        },
      ]),
      secretOrKey: process.env.RT_SECRET, // Use ConfigService for the secret
      passReqToCallback: true, // Pass the request object to the validate method
    });
  }

  validate(req: Request, payload: JwtPayload): JwtPayloadWithRt {
    const refreshToken = req.cookies?.['refreshToken']; // Extract the refresh token from cookies

    if (!refreshToken) {
      throw new ForbiddenException('Refresh token malformed or missing');
    }

    return {
      ...payload,
      refreshToken,
    };
  }
}
