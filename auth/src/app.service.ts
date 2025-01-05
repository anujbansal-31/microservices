import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { JwtPayload, Tokens } from '@microservicess/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import * as argon from 'argon2';

import { SignInDto, SignUpDto, UpdateUserDto } from './common/dto';
import { UserResponse } from './common/types/user.response';
import { PrismaService } from './prisma/prisma.service';

interface AuthenticationResponse {
  tokens: Tokens;
  user: UserResponse;
}

const selectUser = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
};

@Injectable()
export class AppService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async signupLocal(dto: SignUpDto): Promise<AuthenticationResponse> {
    const passwordHash = await argon.hash(dto.password);

    const user = await this.prisma.user
      .create({
        data: {
          name: dto.name,
          email: dto.email,
          password: passwordHash,
        },
      })
      .catch((error) => {
        if (error instanceof PrismaClientKnownRequestError) {
          if (error.code === 'P2002') {
            throw new ForbiddenException('Credentials incorrect');
          }
        }
        throw error;
      });

    const tokens = await this.getTokens(user.id);
    await this.updateRtHash(user.id, tokens.refresh_token);

    const userData = await this.getCurrentUser(user.id);
    return { tokens, user: userData };
  }

  async signinLocal(dto: SignInDto): Promise<AuthenticationResponse> {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (!user) throw new ForbiddenException('Access Denied');

    const passwordMatches = await argon.verify(user.password, dto.password);
    if (!passwordMatches) throw new ForbiddenException('Access Denied');

    const tokens = await this.getTokens(user.id);
    await this.updateRtHash(user.id, tokens.refresh_token);

    const userData = await this.getCurrentUser(user.id);
    return { tokens, user: userData };
  }

  async logout(userId: number): Promise<{ message: string }> {
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        hashedRt: null,
      },
    });
    return { message: 'Success' };
  }

  async getCurrentUser(userId: number): Promise<UserResponse> {
    return await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: selectUser,
    });
  }

  async updateUser(userId: number, data: UpdateUserDto): Promise<UserResponse> {
    return await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        ...data,
      },
      select: selectUser,
    });
  }

  async refreshTokens(
    userId: number,
    rt: string,
  ): Promise<AuthenticationResponse> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
    if (!user || !user.hashedRt) throw new ForbiddenException('Access Denied');

    const rtMatches = await argon.verify(user.hashedRt, rt);
    if (!rtMatches) throw new ForbiddenException('Access Denied');

    const tokens = await this.getTokens(user.id);
    await this.updateRtHash(user.id, tokens.refresh_token);

    const userData = await this.getCurrentUser(user.id);
    return { tokens, user: userData };
  }

  async updateRtHash(userId: number, rt: string): Promise<void> {
    const hash = await argon.hash(rt);
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        hashedRt: hash,
      },
    });
  }

  async getTokens(userId: number): Promise<Tokens> {
    const jwtPayload: JwtPayload = {
      sub: userId,
    };

    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(jwtPayload, {
        secret: process.env.AT_SECRET,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(jwtPayload, {
        secret: process.env.RT_SECRET,
        expiresIn: '7d',
      }),
    ]);

    return {
      access_token: at,
      refresh_token: rt,
    };
  }
}
