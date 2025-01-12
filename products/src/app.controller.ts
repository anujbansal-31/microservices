import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import {
  GetCurrentUserId,
  Public,
  createResponse,
} from '@microservicess/common';

import { AppService } from './app.service';
import { CreateProductDto, UpdateProductDto } from './common/dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createProduct(
    @Body() dto: CreateProductDto,
    @GetCurrentUserId() userId: number,
  ) {
    const product = await this.appService.createProduct(dto, userId);
    return createResponse('success', 'Product created successfully', product);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @GetCurrentUserId() userId: number,
  ) {
    const product = await this.appService.updateProduct(id, dto, userId);
    return createResponse('success', 'Product updated successfully', product);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteProduct(@Param('id') id: string) {
    const result = await this.appService.deleteProduct(id);
    return createResponse('success', 'Product deleted successfully', result);
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
}
