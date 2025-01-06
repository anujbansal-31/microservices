import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { faker } from '@faker-js/faker';
import { GlobalExceptionsFilter } from '@microservicess/common';
import cookieParser from 'cookie-parser';
import { decode } from 'jsonwebtoken';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface ParsedCookies {
  [key: string]: string;
}

describe('Auth E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const getSignInRequestPayload = () => ({
    email: faker.internet.email(),
    password: 'super-secret-password',
  });

  let testSignUpPayload: any;
  let testSignInPayload: any;
  let cookies: any;

  // Parsing the cookies
  let parsedCookies: ParsedCookies;

  function cookiesParser(cookies: string[]) {
    return cookies.reduce<ParsedCookies>((acc, cookie) => {
      const [keyValue] = cookie.split(';'); // Extract the key-value pair
      const [key, value] = keyValue.split('='); // Split into key and value
      if (key && value) {
        acc[key.trim()] = value.trim(); // Ensure no leading or trailing spaces
      }
      return acc;
    }, {});
  }

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: (errors) => {
          // Forward class-validator errors as an array to the filter
          return new BadRequestException(errors);
        },
      }),
    );
    app.useGlobalFilters(new GlobalExceptionsFilter());
    await app.init();

    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await cleanDb();
    await app.close();
  });

  beforeEach(() => {
    testSignInPayload = getSignInRequestPayload();
    testSignUpPayload = {
      ...testSignInPayload,
      name: 'Test User',
    };
    if (cookies) {
      parsedCookies = cookiesParser(cookies);
    }
  });

  const cleanDb = async () => {
    await prisma.cleanDatabase();
  };

  // ---------------------------------------------------------------------------
  // SIGNUP
  // ---------------------------------------------------------------------------
  describe('Signup (POST /local/signup)', () => {
    beforeAll(async () => {
      await cleanDb();
    });

    it('should signup a new user', async () => {
      const res = await request(app.getHttpServer())
        .post('/local/signup')
        .send(testSignUpPayload);

      const body = res.body;

      expect(body.status).toBe('success');
      expect(body.message).toBe('SignUp successfully');
      expect(body.data).toHaveProperty('id');
      expect(body.data).toHaveProperty('email', testSignUpPayload.email);
    });

    it('should fail on duplicate signup', async () => {
      await request(app.getHttpServer())
        .post('/local/signup')
        .send(testSignUpPayload)
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/local/signup')
        .send(testSignUpPayload)
        .expect(403);

      expect(res.body.status).toBe('error');
      expect(res.body.message).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // SIGNIN
  // ---------------------------------------------------------------------------
  describe('Signin (POST /local/signin)', () => {
    beforeAll(async () => {
      await cleanDb();
    });

    it('should throw 403 if user does not exist', async () => {
      const res = await request(app.getHttpServer())
        .post('/local/signin')
        .send(testSignInPayload)
        .expect(403);

      expect(res.body.status).toBe('error');
      expect(res.body.message).toBeDefined();
    });

    it('should successfully sign in after signing up', async () => {
      await request(app.getHttpServer())
        .post('/local/signup')
        .send(testSignUpPayload)
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/local/signin')
        .send(testSignInPayload)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('SignIn successfully');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('email', testSignInPayload.email);
    });

    it('should throw 403 if password is incorrect', async () => {
      await request(app.getHttpServer())
        .post('/local/signup')
        .send(testSignUpPayload)
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/local/signin')
        .send({
          email: testSignInPayload.email,
          password: testSignInPayload.password + 'extra',
        })
        .expect(403);

      expect(res.body.status).toBe('error');
      expect(res.body.message).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // LOGOUT
  // ---------------------------------------------------------------------------
  describe('Logout (POST /logout)', () => {
    beforeAll(async () => {
      await cleanDb();
      const signupRes = await request(app.getHttpServer())
        .post('/local/signup')
        .send(testSignUpPayload);

      cookies = signupRes.get('Set-Cookie');
    });

    it('should pass if logout is called for a non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/logout')
        .set('Cookie', 'invalid')
        .expect(401);
    });

    it('should logout the existing user', async () => {
      const res = await request(app.getHttpServer())
        .post('/logout')
        .set('Cookie', cookies)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Logout successfully');
    });
  });

  // ---------------------------------------------------------------------------
  // REFRESH TOKENS
  // ---------------------------------------------------------------------------
  describe('Refresh (POST /refresh)', () => {
    beforeAll(async () => {
      await cleanDb();
    });

    it('should refresh tokens successfully', async () => {
      const signupRes = await request(app.getHttpServer())
        .post('/local/signup')
        .send(testSignUpPayload)
        .expect(201);

      cookies = signupRes.get('Set-Cookie');

      const oldAccessToken = parsedCookies.access_token;
      const oldRefreshToken = parsedCookies.refresh_token;

      await new Promise((res) => setTimeout(res, 1000));

      const refreshRes = await request(app.getHttpServer())
        .post('/refresh')
        .set('Cookie', cookies)
        .expect(200);

      cookies = refreshRes.get('Set-Cookie');
      parsedCookies = cookiesParser(cookies);

      expect(refreshRes.body.status).toBe('success');
      expect(refreshRes.body.message).toBe('Fetched tokens successfully');
      expect(parsedCookies.access_token).not.toBe(oldAccessToken);
      expect(parsedCookies.refresh_token).not.toBe(oldRefreshToken);
    });
  });

  // ---------------------------------------------------------------------------
  // GET CURRENT USER
  // ---------------------------------------------------------------------------
  describe('Get current user (GET /current-user)', () => {
    beforeAll(async () => {
      await cleanDb();
    });

    it('should return the logged in user', async () => {
      const signupRes = await request(app.getHttpServer())
        .post('/local/signup')
        .send(testSignUpPayload)
        .expect(201);

      cookies = signupRes.get('Set-Cookie');

      const { access_token } = parsedCookies;
      const decoded = decode(access_token) as { sub: string };
      const userId = Number(decoded.sub);

      const currentUserRes = await request(app.getHttpServer())
        .get('/current-user')
        .set('Cookie', cookies)
        .expect(200);

      expect(currentUserRes.body.status).toBe('success');
      expect(currentUserRes.body.message).toBe('Data fetched successfully');
      expect(currentUserRes.body.data).toHaveProperty('id', userId);
      expect(currentUserRes.body.data).toHaveProperty(
        'email',
        testSignUpPayload.email,
      );
    });
  });
});
