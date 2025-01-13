import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { faker } from '@faker-js/faker';
import { GlobalExceptionsFilter } from '@microservicess/common';
import { ObjectId } from 'bson';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

jest.setTimeout(30000); // Increase if needed for slower environments
jest.mock('../src/events/user-modified.consumer.service');

/**
 * Utility to parse Set-Cookie headers into an object
 */

describe('Products E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  // Will hold authenticated user cookies
  let cookies: string[];

  // Example product payload for creation
  const createProductPayload = {
    title: 'Test Product',
    description: 'A product for testing',
    inStock: 50,
    price: 99.99,
  };

  // Will store created product ID for use in subsequent tests
  let createdProductId: string;

  /**
   * Clean database utility: Clears all relevant tables
   */
  const cleanDb = async () => {
    // Adjust this to your actual clean method if different
    await prisma.cleanDatabase();
  };

  beforeAll(async () => {
    // Create and compile the testing module
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // Create Nest application
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: (errors) => {
          return new BadRequestException(errors);
        },
      }),
    );
    app.useGlobalFilters(new GlobalExceptionsFilter());
    await app.init();

    // Get Prisma service for DB cleanup
    prisma = moduleRef.get(PrismaService);
    jwtService = moduleRef.get(JwtService);
    await cleanDb();
  });

  beforeEach(async () => {
    const referenceId = Math.floor(Math.random() * 10);
    await prisma.users.create({
      data: {
        referenceId,
        name: 'Test',
        email: 'test@email.com',
        hashedRt: 'fake-hashed-refresh-token',
        status: 'ACTIVE',
        updatedAt: new Date().toISOString(),
      },
    });

    const jwtPayload = {
      sub: referenceId,
    };

    // Create the JWT!
    const token = await jwtService.signAsync(jwtPayload, {
      secret: process.env.AT_SECRET,
      expiresIn: '15m',
    });

    cookies = [`access_token=${token}; Path=/; HttpOnly`];
  });

  afterAll(async () => {
    await cleanDb();
    await app.close();
  });

  // --------------------------------------------------
  // CREATE PRODUCT
  // --------------------------------------------------
  describe('POST / (createProduct)', () => {
    it('should create a product', async () => {
      const res = await request(app.getHttpServer())
        .post('/')
        .set('Cookie', cookies)
        .send(createProductPayload)
        .expect(201);

      const body = res.body;
      expect(body.status).toBe('success');
      expect(body.message).toBe('Product created successfully');
      expect(body.data).toHaveProperty('id');
      expect(body.data).toHaveProperty('slug'); // auto-generated
      expect(body.data).toHaveProperty('title', createProductPayload.title);
      expect(body.data).toHaveProperty(
        'description',
        createProductPayload.description,
      );
      expect(body.data).toHaveProperty('inStock', createProductPayload.inStock);
      expect(body.data).toHaveProperty('price', createProductPayload.price);
      expect(body.data).toHaveProperty('sold', false);

      // Save product ID for further tests
      createdProductId = body.data.id;
    });

    it('should fail to create product if user is not authenticated', async () => {
      const res = await request(app.getHttpServer())
        .post('/')
        .send(createProductPayload)
        .expect(401); // or your defined auth error code

      expect(res.body.status).toBe('error');
    });
  });

  // --------------------------------------------------
  // GET ALL PRODUCTS
  // --------------------------------------------------
  describe('GET / (getAllProducts)', () => {
    it('should retrieve all products', async () => {
      const res = await request(app.getHttpServer()).get('/').expect(200);

      const body = res.body;
      expect(body.status).toBe('success');
      expect(body.message).toBe('Products fetched successfully');
      expect(Array.isArray(body.data)).toBe(true);

      // At least the product we just created
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --------------------------------------------------
  // GET PRODUCT BY ID
  // --------------------------------------------------
  describe('GET /:id (getProductById)', () => {
    it('should get product by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/${createdProductId}`)
        .expect(200);

      const body = res.body;
      expect(body.status).toBe('success');
      expect(body.message).toBe('Product fetched successfully');
      expect(body.data).toHaveProperty('id', createdProductId);
    });

    it('should throw 404 if product is not found', async () => {
      const fakeId = new ObjectId();
      const res = await request(app.getHttpServer())
        .get(`/${fakeId}`)
        .expect(404);

      expect(res.body.status).toBe('error');
      expect(res.body.message).toContain('Product not found');
    });
  });

  // --------------------------------------------------
  // UPDATE PRODUCT
  // --------------------------------------------------
  describe('PATCH /:id (updateProduct)', () => {
    let createdProductId: string = null;
    const updatedPayload = {
      title: 'Updated Title',
      description: 'Updated Description',
      inStock: 777,
      price: 123.45,
    };

    it('should update the product', async () => {
      const createProductsRes = await request(app.getHttpServer())
        .post('/')
        .set('Cookie', cookies)
        .send(createProductPayload)
        .expect(201);

      createdProductId = createProductsRes.body.data.id;

      const res = await request(app.getHttpServer())
        .patch(`/${createdProductId}`)
        .set('Cookie', cookies)
        .send(updatedPayload)
        .expect(200);

      const body = res.body;
      expect(body.status).toBe('success');
      expect(body.message).toBe('Product updated successfully');
      expect(body.data).toHaveProperty('id', createdProductId);
      expect(body.data).toHaveProperty('title', updatedPayload.title);
      expect(body.data).toHaveProperty(
        'description',
        updatedPayload.description,
      );
      expect(body.data).toHaveProperty('inStock', updatedPayload.inStock);
      expect(body.data).toHaveProperty('price', updatedPayload.price);
    });

    it('should fail if product does not exist', async () => {
      const fakeId = new ObjectId().toString();

      const res = await request(app.getHttpServer())
        .patch(`/${fakeId}`)
        .set('Cookie', cookies)
        .send(updatedPayload)
        .expect(404);

      expect(res.body.status).toBe('error');
      expect(res.body.message).toContain('Product not found');
    });

    it('should fail to update if user not authenticated', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/${createdProductId}`)
        .send(updatedPayload)
        .expect(401); // or your custom unauthorized code

      expect(res.body.status).toBe('error');
    });
  });

  // --------------------------------------------------
  // DELETE PRODUCT
  // --------------------------------------------------
  describe('DELETE /:id (deleteProduct)', () => {
    it('should delete the product', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/${createdProductId}`)
        .set('Cookie', cookies)
        .expect(200);

      const body = res.body;
      expect(body.status).toBe('success');
      expect(body.message).toBe('Product deleted successfully');
    });

    it('should throw NotFound if product already deleted', async () => {
      // Try deleting again
      const res = await request(app.getHttpServer())
        .delete(`/${createdProductId}`)
        .set('Cookie', cookies)
        .expect(404);

      expect(res.body.status).toBe('error');
      expect(res.body.message).toContain('Product not found');
    });

    it('should fail if user is not authenticated', async () => {
      // Re-create a product
      const productRes = await request(app.getHttpServer())
        .post('/')
        .set('Cookie', cookies)
        .send(createProductPayload);

      const newProductId = productRes.body.data.id;

      // Now delete without cookie
      const res = await request(app.getHttpServer())
        .delete(`/${newProductId}`)
        .expect(401);

      expect(res.body.status).toBe('error');
    });
  });
});
