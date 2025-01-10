// cache.module.ts
import { CacheModule as ICacheModule } from '@nestjs/cache-manager';
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import redisStore from 'cache-manager-redis-store';

import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [
    ICacheModule.register({
      store: process.env.NODE_ENV === 'test' ? 'memory' : redisStore,
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      no_ready_check: true,
      isGlobal: true,
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
