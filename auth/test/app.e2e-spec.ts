import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { faker } from '@faker-js/faker';
import { decode } from 'jsonwebtoken';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const getTestUser = () => ({
    name: 'Test User',
    email: faker.internet.email(),
    password: 'super-secret-password',
  });

  let accessToken: string;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let refreshToken: string;
  let userId: number;
  let testUser: any;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    // Ensure the global prefix matches the application
    app.setGlobalPrefix('v1/api');

    // Apply global pipes and middleware
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await cleanDb();
    await app.close();
  });

  beforeEach(() => {
    // Ensure testUser is initialized before each test
    testUser = getTestUser();
  });

  /**
   * Helper function to clean DB.
   * If you have a custom method in PrismaService, call it here.
   */
  const cleanDb = async () => {
    await prisma.cleanDatabase();
  };

  // ---------------------------------------------------------------------------
  // SIGNUP
  // ---------------------------------------------------------------------------
  describe('Signup (POST /v1/api/auth/local/signup)', () => {
    beforeAll(async () => {
      await cleanDb();
    });

    it('should signup a new user', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/api/auth/local/signup') // Include the correct global prefix
        .send(testUser);
      // .expect(201);

      const body = res.body;

      expect(body).toHaveProperty('access_token');
      expect(body).toHaveProperty('refresh_token');
    });

    it('should fail on duplicate signup', async () => {
      await request(app.getHttpServer())
        .post('/v1/api/auth/local/signup') // Include the correct global prefix
        .send(testUser)
        .expect(201);

      // Attempt to signup with the same credentials
      const res = await request(app.getHttpServer())
        .post('/v1/api/auth/local/signup')
        .send(testUser)
        .expect(403);

      // Check if the response has an error message
      expect(res.body.message).toBeDefined();
    });
  });

  // // ---------------------------------------------------------------------------
  // // SIGNIN
  // // ---------------------------------------------------------------------------
  describe('Signin (POST /v1/api/auth/local/signin)', () => {
    beforeAll(async () => {
      await cleanDb();
    });

    it('should throw 403 if user does not exist', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/api/auth/local/signin')
        .send(testUser)
        .expect(403);

      expect(res.body.message).toBeDefined();
    });

    it('should successfully sign in after signing up', async () => {
      // first, create a user
      await request(app.getHttpServer())
        .post('/v1/api/auth/local/signup')
        .send(testUser)
        .expect(201);

      // now sign in with the newly created user
      const res = await request(app.getHttpServer())
        .post('/v1/api/auth/local/signin')
        .send(testUser)
        .expect(200);

      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('refresh_token');
    });

    it('should throw 403 if password is incorrect', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/api/auth/local/signin')
        .send({
          email: testUser.email,
          password: testUser.password + 'extra',
        })
        .expect(403);

      expect(res.body.message).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // LOGOUT
  // ---------------------------------------------------------------------------
  describe('Logout (POST /v1/api/auth/logout)', () => {
    beforeAll(async () => {
      await cleanDb();
      // Create and login the user so we have a valid token
      const signupRes = await request(app.getHttpServer())
        .post('/v1/api/auth/local/signup')
        .send(testUser);

      accessToken = signupRes.body.access_token;
      refreshToken = signupRes.body.refresh_token;
      const decoded = decode(accessToken) as { sub: string };
      userId = Number(decoded.sub);
    });

    it('should pass if logout is called for a non-existent user', async () => {
      // call logout with a random user ID
      await request(app.getHttpServer())
        .post('/v1/api/auth/logout')
        // Overwrite Bearer token with "someone else"
        .set('Authorization', 'Bearer someInvalidToken')
        .expect(401);
    });

    it('should logout the existing user', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.message).toBe('Success');

      // optionally: verify in DB that hashedRt is now null
      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user?.hashedRt).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // REFRESH TOKENS
  // ---------------------------------------------------------------------------
  describe('Refresh (POST /v1/api/auth/refresh)', () => {
    beforeAll(async () => {
      await cleanDb();
    });

    it('should throw 403 if user does not exist', async () => {
      // call refresh with random token
      await request(app.getHttpServer())
        .post('/v1/api/auth/refresh')
        .set('Authorization', 'Bearer someInvalidRefreshToken')
        .expect(401);
    });

    it('should throw if user is logged out (hashedRt = null)', async () => {
      // 1) Signup and get tokens
      const signupRes = await request(app.getHttpServer())
        .post('/v1/api/auth/local/signup')
        .send(testUser)
        .expect(201);

      const { access_token, refresh_token } = signupRes.body;

      // 2) decode refresh to find userId
      const decoded = decode(refresh_token) as { sub: string };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const userId = Number(decoded.sub);

      // 3) Logout => sets hashedRt to null
      await request(app.getHttpServer())
        .post('/v1/api/auth/logout')
        .set('Authorization', `Bearer ${access_token}`)
        .expect(200);

      // 4) Try to refresh => should fail
      const refreshRes = await request(app.getHttpServer())
        .post('/v1/api/auth/refresh')
        .set('Authorization', `Bearer ${refresh_token}`)
        .expect(403);

      expect(refreshRes.body.message).toBeDefined();
    });

    it('should throw if refresh token is invalid', async () => {
      // 1) Signup and get tokens
      const signupRes = await request(app.getHttpServer())
        .post('/v1/api/auth/local/signup')
        .send(testUser)
        .expect(201);

      const { refresh_token } = signupRes.body;
      // 2) call refresh with bogus refresh token
      const refreshRes = await request(app.getHttpServer())
        .post('/v1/api/auth/refresh')
        .set('Authorization', `Bearer ${refresh_token}XYZ`) // invalid
        .expect(401);

      expect(refreshRes.body.message).toBeDefined();
    });

    it('should refresh tokens successfully', async () => {
      // 1) Signup
      await cleanDb();
      const signupRes = await request(app.getHttpServer())
        .post('/v1/api/auth/local/signup')
        .send(testUser)
        .expect(201);

      const oldAccessToken = signupRes.body.access_token;
      const oldRefreshToken = signupRes.body.refresh_token;

      // 2) Wait a second so new tokens have a different timestamp
      await new Promise((res) => setTimeout(res, 1000));

      // 3) Refresh
      const refreshRes = await request(app.getHttpServer())
        .post('/v1/api/auth/refresh')
        .set('Authorization', `Bearer ${oldRefreshToken}`)
        .expect(200);

      expect(refreshRes.body.access_token).toBeDefined();
      expect(refreshRes.body.refresh_token).toBeDefined();

      // 4) ensure tokens are different
      expect(refreshRes.body.access_token).not.toBe(oldAccessToken);
      expect(refreshRes.body.refresh_token).not.toBe(oldRefreshToken);
    });
  });

  // ---------------------------------------------------------------------------
  // GET CURRENT USER
  // ---------------------------------------------------------------------------
  describe('Get current user (GET /v1/api/auth/current-user)', () => {
    beforeAll(async () => {
      await cleanDb();
    });

    it('should return the logged in user', async () => {
      // 1) Signup (and automatically log in)
      const signupRes = await request(app.getHttpServer())
        .post('/v1/api/auth/local/signup')
        .send(testUser)
        .expect(201);

      const { access_token } = signupRes.body;
      const decoded = decode(access_token) as { sub: string };
      const userId = Number(decoded.sub);

      // 2) Request current user
      const currentUserRes = await request(app.getHttpServer())
        .get('/v1/api/auth/current-user')
        .set('Authorization', `Bearer ${access_token}`)
        .expect(200);

      expect(currentUserRes.body.id).toBe(userId);
      expect(currentUserRes.body.email).toBe(testUser.email);
      // Adjust any other user properties you expect
    });
  });
});
