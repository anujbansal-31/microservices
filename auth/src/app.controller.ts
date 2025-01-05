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

import {
  GenericResponse,
  RtGuard,
  createResponse,
} from '@microservicess/common';
import { Response } from 'express';

import { AppService } from './app.service';
import { GetCurrentUser, GetCurrentUserId, Public } from './common/decorators';
import { SignInDto, SignUpDto, UpdateUserDto } from './common/dto';
import { UserResponse } from './common/types/user.response';

@Controller('auth')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Post('local/signup')
  @HttpCode(HttpStatus.CREATED)
  async signupLocal(
    @Body() dto: SignUpDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<GenericResponse<UserResponse>> {
    const { tokens, user } = await this.appService.signupLocal(dto);
    response.cookie('access_token', tokens.access_token);
    response.cookie('refresh_token', tokens.refresh_token);

    return createResponse('success', 'SignUp successfully', user);
  }

  @Public()
  @Post('local/signin')
  @HttpCode(HttpStatus.OK)
  async signinLocal(
    @Body() dto: SignInDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<GenericResponse<UserResponse>> {
    const { tokens, user } = await this.appService.signinLocal(dto);

    response.cookie('access_token', tokens.access_token);
    response.cookie('refresh_token', tokens.refresh_token);

    return createResponse('success', 'SignIn successfully', user);
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
  ): Promise<GenericResponse<UserResponse>> {
    const { tokens, user } = await this.appService.refreshTokens(
      userId,
      refreshToken,
    );

    response.cookie('access_token', tokens.access_token);
    response.cookie('refresh_token', tokens.refresh_token);

    return createResponse('success', 'Fetched tokens successfully', user);
  }

  @Get('current-user')
  @HttpCode(HttpStatus.OK)
  async loggedInUser(
    @GetCurrentUserId() userId: number,
  ): Promise<GenericResponse<UserResponse>> {
    const user = await this.appService.getCurrentUser(userId);
    return createResponse('success', 'Data fetched successfully', user);
  }

  @Patch('user')
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Body() dto: UpdateUserDto,
  ): Promise<GenericResponse<UserResponse>> {
    const { id, ...payload } = dto;
    const user = await this.appService.updateUser(id, payload);
    return createResponse('success', 'Updated successfully', user);
  }

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  root() {
    return createResponse('success', 'Success');
  }

  @Public()
  @Get('health')
  @HttpCode(HttpStatus.OK)
  health() {
    return createResponse('success', 'Success');
  }

  @Public()
  @Get('example')
  getExample() {
    const data = { exampleKey: 'exampleValue' };
    return createResponse('success', 'Data fetched successfully', data);
  }
}
