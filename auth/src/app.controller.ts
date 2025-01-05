import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';

import { Health, RtGuard, Tokens } from '@microservicess/common';
import { User } from '@prisma/client';
import { Response } from 'express';

import { AppService } from './app.service';
import { GetCurrentUser, GetCurrentUserId, Public } from './common/decorators';
import { SignInDto, SignUpDto, UpdateUserDto } from './common/dto';

@Controller('auth')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Post('local/signup')
  @HttpCode(HttpStatus.CREATED)
  async signupLocal(
    @Body() dto: SignUpDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Tokens> {
    const tokens = await this.appService.signupLocal(dto);
    response.cookie('access_token', tokens.access_token);
    response.cookie('refresh_token', tokens.refresh_token);

    return tokens;
  }

  @Public()
  @Post('local/signin')
  @HttpCode(HttpStatus.OK)
  async signinLocal(
    @Body() dto: SignInDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Tokens> {
    const tokens = await this.appService.signinLocal(dto);

    response.cookie('access_token', tokens.access_token);
    response.cookie('refresh_token', tokens.refresh_token);

    return tokens;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@GetCurrentUserId() userId: number): Promise<{ message: string }> {
    return this.appService.logout(userId);
  }

  @Public()
  @UseGuards(RtGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @GetCurrentUserId() userId: number,
    @GetCurrentUser('refreshToken') refreshToken: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Tokens> {
    const tokens = await this.appService.refreshTokens(userId, refreshToken);

    response.cookie('access_token', tokens.access_token);
    response.cookie('refresh_token', tokens.refresh_token);

    return tokens;
  }

  @Get('current-user')
  @HttpCode(HttpStatus.OK)
  loggedInUser(@GetCurrentUserId() userId: number): Promise<User> {
    return this.appService.loggedInUser(userId);
  }

  @Patch('user')
  @HttpCode(HttpStatus.OK)
  updateUser(@Body() dto: UpdateUserDto): Promise<User> {
    const { id, ...payload } = dto;
    return this.appService.updateUser(id, payload);
  }

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  root(): Health {
    return this.appService.health();
  }

  @Public()
  @Get('health')
  @HttpCode(HttpStatus.OK)
  health(): Health {
    return this.appService.health();
  }
}
