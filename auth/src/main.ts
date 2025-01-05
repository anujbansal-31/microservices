import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import * as cookieParser from 'cookie-parser';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v1/api');
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe());
  app.enableCors({
    credentials: true,
    origin: '*',
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
