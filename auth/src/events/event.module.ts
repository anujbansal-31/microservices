import { Module } from '@nestjs/common';

import { UserModifiedConsumer } from './user-modified.consumer.service';
import { UserModifiedProducer } from './user-modified.producer.service';

@Module({
  providers: [UserModifiedProducer, UserModifiedConsumer],
  exports: [UserModifiedProducer, UserModifiedConsumer],
})
export class EventModule {}
