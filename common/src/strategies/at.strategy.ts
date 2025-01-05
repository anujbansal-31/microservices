import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { JwtPayload } from '../types/jwtPayload.type';

@Injectable()
export class AtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // Retrieve the token from the cookies
          return request?.cookies?.['accessToken'] || null;
        },
      ]),
      secretOrKey: process.env.AT_SECRET,
    });
  }

  validate(payload: JwtPayload) {
    return payload;
  }
}
