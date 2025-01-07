import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';

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
  private readonly logger = new Logger('ConsumerService');

  constructor(private readonly prisma: PrismaService) {}

  async consume({ topic, config, onMessage }: KafkajsConsumerOptions) {
    try {
      this.logger.log(
        `Initializing consumer for topic: ${topic.topic}, groupId: ${
          config?.groupId || process.env.KAFKA_GROUP_ID
        }`,
      );

      if (!config) {
        config = { groupId: process.env.KAFKA_GROUP_ID };
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

      this.logger.log(
        `Consumer successfully started for topic: ${topic.topic}`,
      );
    } catch (err) {
      this.logger.error(
        `Error initializing consumer for topic: ${topic.topic}`,
        err,
      );
      throw err;
    }
  }

  async onApplicationShutdown() {
    this.logger.log('Shutting down consumers...');
    for (const consumer of this.consumers) {
      try {
        await consumer.disconnect();
      } catch (err) {
        this.logger.error('Error during consumer shutdown.', err);
      }
    }
    this.logger.log('All consumers shut down successfully.');
  }
}
