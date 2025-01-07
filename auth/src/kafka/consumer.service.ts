import { Injectable, OnApplicationShutdown } from '@nestjs/common';

import { ConsumerConfig, ConsumerSubscribeTopic, KafkaMessage } from 'kafkajs';
import { PrismaService } from 'src/prisma/prisma.service';

import { IConsumer } from './consumer.interface';
import { KafkajsConsumer } from './kafkajs.consumer';

interface KafkajsConsumerOptions {
  topic: ConsumerSubscribeTopic;
  config?: ConsumerConfig;
  onMessage: (message: KafkaMessage) => Promise<void>;
}

@Injectable()
export class ConsumerService implements OnApplicationShutdown {
  private readonly consumers: IConsumer[] = [];

  constructor(private readonly prisma: PrismaService) {}

  async consume({ topic, config, onMessage }: KafkajsConsumerOptions) {
    console.log(
      'process.env.KAFKA_GROUP_ID',
      process.env.KAFKA_GROUP_ID,
      process.env.KAFKA_BROKER,
      process.env.KAFKA_CLIENT_ID,
    );
    if (!config) {
      config = {
        groupId: process.env.KAFKA_GROUP_ID,
      };
    }
    if (!config?.groupId) {
      config.groupId = process.env.KAFKA_GROUP_ID;
    }
    const consumer = new KafkajsConsumer(
      topic,
      this.prisma,
      config,
      process.env.KAFKA_BROKER,
    );
    await consumer.connect();
    await consumer.consume(onMessage);
    this.consumers.push(consumer);
  }

  async onApplicationShutdown() {
    for (const consumer of this.consumers) {
      await consumer.disconnect();
    }
  }
}
