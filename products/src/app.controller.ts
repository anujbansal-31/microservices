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

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  root() {
    return createResponse('success', 'Success');
  }

  // @Public()
  @Get('health')
  @HttpCode(HttpStatus.OK)
  health() {
    return createResponse('success', 'Success');
  }

  // @Public()
  // @Get('testing')
  // @HttpCode(HttpStatus.OK)
  // async testing() {
  //   await this.userModifiedProducer.publish({
  //     id: '112',
  //     name: 'Anuj Bansal',
  //     email: 'asasa@asas.com',
  //     updatedAt: '1212',
  //     hashedRt: 'asasas',
  //     status: 'Active',
  //   });
  //   return createResponse('success', 'Success');
  // }
}
