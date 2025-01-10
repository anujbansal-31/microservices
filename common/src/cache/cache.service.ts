import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';

import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  public async get(key: string) {
    const data = (await this.cacheManager.get(key)) as string;
    if (data) {
      console.log('cache get:-', key, ' with data:-', JSON.parse(data));
      return JSON.parse(data);
    }
    return data;
  }

  public async set(key: string, value: object | string, ttl = 0) {
    console.log('cache set:-', key, ' with ttl:-', ttl);
    return await this.cacheManager.set(key, JSON.stringify(value), { ttl });
  }

  public async del(key: string) {
    return await this.cacheManager.del(key);
  }

  public async reset() {
    return await this.cacheManager.reset();
  }
}
