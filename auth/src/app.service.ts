import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { JwtPayload, Tokens } from '@microservicess/common';
import { Status } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import * as argon from 'argon2';

import { SignInDto, SignUpDto, UpdateUserDto } from './common/dto';
import { UserResponse } from './common/types/user.response';
import { UserModifiedProducer } from './events/user-modified.producer.service';
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
    private readonly userModifiedProducer: UserModifiedProducer,
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

    // Publish the user modified event
    this.publishUserModifiedEvent(user.id);

    return { tokens, user: userData };
  }

  async signinLocal(dto: SignInDto): Promise<AuthenticationResponse> {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (!user || user.status !== Status.ACTIVE) {
      throw new ForbiddenException('Access Denied');
    }

    const passwordMatches = await argon.verify(user.password, dto.password);
    if (!passwordMatches) throw new ForbiddenException('Access Denied');

    const tokens = await this.getTokens(user.id);
    await this.updateRtHash(user.id, tokens.refresh_token);

    const userData = await this.getCurrentUser(user.id);

    // Publish the user modified event
    this.publishUserModifiedEvent(user.id);

    return { tokens, user: userData };
  }

  async logout(userId: number): Promise<boolean> {
    const user = await this.getCurrentUser(userId, {
      hashedRt: {
        not: null,
      },
    });

    if (!user) {
      throw new BadRequestException('Not Logged In');
    }

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        hashedRt: null,
      },
    });

    // Publish the user modified event
    this.publishUserModifiedEvent(user.id);

    return true;
  }

  async getCurrentUser(userId: number, filters?: any): Promise<UserResponse> {
    return await this.prisma.user.findUnique({
      where: {
        id: userId,
        ...(filters ? { ...filters } : {}),
      },
      select: selectUser,
    });
  }

  async updateUser(userId: number, data: UpdateUserDto): Promise<UserResponse> {
    const userResponse = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        ...data,
      },
      select: selectUser,
    });

    // Publish the user modified event
    this.publishUserModifiedEvent(userResponse.id);

    return userResponse;
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
    if (!user || !user.hashedRt || user.status !== Status.ACTIVE) {
      throw new ForbiddenException('Access Denied');
    }

    const rtMatches = await argon.verify(user.hashedRt, rt);
    if (!rtMatches) throw new ForbiddenException('Access Denied');

    const tokens = await this.getTokens(user.id);
    await this.updateRtHash(user.id, tokens.refresh_token);

    const userData = await this.getCurrentUser(user.id);

    // Publish the user modified event
    this.publishUserModifiedEvent(user.id);

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

  async publishUserModifiedEvent(userId: number) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
      },
    });
    await this.userModifiedProducer.publish({
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      updatedAt: user.updatedAt.toISOString(),
      hashedRt: user.hashedRt,
      status: user.status,
    });
  }
}
