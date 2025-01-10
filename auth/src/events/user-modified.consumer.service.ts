import { Injectable } from '@nestjs/common';

import {
  CacheService,
  Consumer,
  SEVEN_DAYS,
  Topics,
  UserModifiedEvent,
} from '@microservicess/common';
import { KafkaMessage } from 'kafkajs';

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
