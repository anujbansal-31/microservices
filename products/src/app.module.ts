import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

import { AtGuard, AtStrategy, RtStrategy } from '@microservicess/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventModule } from './events/event.module';
import { UserModifiedConsumer } from './events/user-modified.consumer.service';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,

      ...(process.env.NODE_ENV === 'test'
        ? {
            envFilePath: ['.env.test.local'],
            ignoreEnvFile: false,
          }
        : {
            ignoreEnvFile: process.env.NODE_ENV === 'development',
          }),
    }),
    JwtModule.register({}),
    PrismaModule,
    EventModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AtGuard,
    },
    AppService,
    AtStrategy,
    RtStrategy,
  ],
})
export class AppModule {
  constructor(private readonly userModifiedConsumer: UserModifiedConsumer) {
    this.runConsumer();
  }

  async runConsumer() {
    await this.userModifiedConsumer.listen();
  }
}
