import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import * as cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { GlobalExceptionsFilter } from './common/errors/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v1/api');
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
  app.enableCors({
    credentials: true,
    origin: '*',
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
