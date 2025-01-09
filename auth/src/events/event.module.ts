import { Module } from '@nestjs/common';

import { UserModifiedProducer } from './user-modified.producer.service';

@Module({
  providers: [UserModifiedProducer],
  exports: [UserModifiedProducer],
})
export class EventModule {}
