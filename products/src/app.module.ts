import { Module } from '@nestjs/common';

import { CacheModule } from '@microservicess/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventModule } from './events/event.module';
import { UserModifiedConsumer } from './events/user-modified.consumer.service';

@Module({
  imports: [CacheModule, EventModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  constructor(private readonly userModifiedConsumer: UserModifiedConsumer) {
    this.runConsumer();
  }

  async runConsumer() {
    await this.userModifiedConsumer.listen();
  }
}
