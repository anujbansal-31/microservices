import { Injectable } from '@nestjs/common';

import { Consumer, Topics, UserModifiedEvent } from '@microservicess/common';
import { KafkaMessage } from 'kafkajs';
import { SEVEN_DAYS } from 'src/common/constants';

import { CacheService } from './../cache/cache.service';

@Injectable()
export class UserModifiedConsumer extends Consumer<UserModifiedEvent> {
  readonly topic = Topics.UserModified;

  constructor(private readonly cacheService: CacheService) {
    super();
  }

  async onMessage(data: UserModifiedEvent['data'], message: KafkaMessage) {
    console.log('Dataa:', data);
    this.cacheService.set(`USER_${data.id}`, data, SEVEN_DAYS);
  }
}
