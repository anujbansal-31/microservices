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
  GenericResponse,
  GetCurrentUserId,
  Public,
  createResponse,
} from '@microservicess/common';

import { AppService } from './app.service';
import { CreateProductDto, UpdateProductDto } from './common/dto';
import { ProductResponse } from './common/types/product.response';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createProduct(
    @Body() dto: CreateProductDto,
    @GetCurrentUserId() userId: number,
  ): Promise<GenericResponse<ProductResponse>> {
    const product = await this.appService.createProduct(dto, userId);
    return createResponse('success', 'Product created successfully', product);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @GetCurrentUserId() userId: number,
  ): Promise<GenericResponse<ProductResponse>> {
    const product = await this.appService.updateProduct(id, dto, userId);
    return createResponse('success', 'Product updated successfully', product);
  }

  @Public() // or remove and add your own guard
  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllProducts(): Promise<GenericResponse<ProductResponse[]>> {
    const products = await this.appService.getAllProducts();
    return createResponse('success', 'Products fetched successfully', products);
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

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteProduct(@Param('id') id: string): Promise<{ message: string }> {
    await this.appService.deleteProduct(id);
    return createResponse('success', 'Product deleted successfully');
  }

  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getProductById(
    @Param('id') id: string,
  ): Promise<GenericResponse<ProductResponse>> {
    const product = await this.appService.getProductById(id);
    return createResponse('success', 'Product fetched successfully', product);
  }
}
