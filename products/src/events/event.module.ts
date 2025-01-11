import { Module } from '@nestjs/common';

import { UserModifiedConsumer } from './user-modified.consumer.service';

@Module({
  providers: [UserModifiedConsumer],
  exports: [UserModifiedConsumer],
})
export class EventModule {}
