import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import { CreateProductDto, UpdateProductDto } from './common/dto';
import { ProductResponse } from './common/types/product.response';
import { PrismaService } from './prisma/prisma.service';
import { SlugUtils } from './utils/slug.utils';

const selectProduct = {
  id: true,
  slug: true,
  title: true,
  description: true,
  inStock: true,
  price: true,
  sold: true,
  createdAt: true,
  updatedAt: true,
};

const selectUser = {
  id: true,
  name: true,
  email: true,
  status: true,
};

@Injectable()
export class AppService {
  private slugUtils: SlugUtils;

  constructor(private prisma: PrismaService) {
    this.slugUtils = new SlugUtils(this.prisma);
  }

  async createProduct(
    dto: CreateProductDto,
    userId: number,
  ): Promise<ProductResponse> {
    try {
      const slug = await this.slugUtils.generateUniqueSlug(dto.title);

      const user = await this.prisma.users.findUnique({
        where: {
          referenceId: userId,
        },
      });

      if (!user) {
        throw new NotFoundException(`User not found`);
      }

      const newProduct = await this.prisma.products.create({
        data: {
          ...dto,
          slug,
          sold: false,
          userId: user.id,
        },
        select: {
          ...selectProduct,
          user: {
            select: selectUser,
          },
        },
      });
      return newProduct;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(`Product already exists.`);
        }
      }
    }
  }

  async updateProduct(
    id: string,
    dto: UpdateProductDto,
    userId: number,
  ): Promise<ProductResponse> {
    try {
      const user = await this.prisma.users.findUnique({
        where: {
          referenceId: userId,
        },
      });

      if (!user) {
        throw new NotFoundException(`User not found`);
      }

      const product = await this.prisma.products.findUnique({
        where: { id, userId: user.id },
      });

      if (!product) {
        throw new NotFoundException(`Product not found.`);
      }

      let slug: string;
      if (dto?.title?.length && product.title !== dto.title) {
        slug = await this.slugUtils.generateUniqueSlug(dto.title);
      }

      const updatedProduct = await this.prisma.products.update({
        where: { id },
        data: {
          ...dto,
          slug,
        },
        select: {
          ...selectProduct,
          user: {
            select: selectUser,
          },
        },
      });
      return updatedProduct;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(`Product already exists.`);
        }
      }

      throw new BadRequestException(
        `Failed to update product: ${error.message}`,
      );
    }
  }

  async deleteProduct(id: string): Promise<void> {
    try {
      await this.prisma.products.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Product not found.`);
        }
      }

      throw new BadRequestException(
        `Failed to update product: ${error.message}`,
      );
    }
  }

  async getAllProducts(): Promise<ProductResponse[]> {
    return this.prisma.products.findMany({
      select: {
        ...selectProduct,
        user: {
          select: selectUser,
        },
      },
    });
  }

  async getProductById(id: string): Promise<ProductResponse> {
    const product = await this.prisma.products.findUnique({
      where: { id },
      select: {
        ...selectProduct,
        user: {
          select: selectUser,
        },
      },
    });
    if (!product) {
      throw new NotFoundException(`Product not found`);
    }
    return product;
  }
}
