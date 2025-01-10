import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';

import { ConsumerConfig, ConsumerSubscribeTopic, KafkaMessage } from 'kafkajs';

import { KafkajsConsumer } from './kafkajs.consumer';

interface Event {
  topic: string;
  data: any;
}

export abstract class Consumer<T extends Event> {
  abstract topic: T['topic'];
  abstract onMessage(data: T['data'], message: KafkaMessage): Promise<void>;

  protected logger = new Logger(this.constructor.name);
  protected consumerService: ConsumerService;

  constructor() {
    this.consumerService = new ConsumerService();
  }

  async listen() {
    this.logger.log(`Starting listener for topic: ${this.topic}`);
    await this.consumerService.consume({
      topic: { topic: this.topic },
      onMessage: this.onMessage.bind(this),
    });
  }
}

@Injectable()
class ConsumerService implements OnApplicationShutdown {
  private readonly consumers: KafkajsConsumer[] = [];
  private readonly logger = new Logger('ConsumerService');

  constructor() {}

  async consume({
    topic,
    config,
    onMessage,
  }: {
    topic: ConsumerSubscribeTopic;
    config?: ConsumerConfig;
    onMessage: (data: unknown, message: KafkaMessage) => Promise<void>;
  }) {
    try {
      this.logger.log(
        `Initializing consumer for topic: ${topic.topic}, groupId: ${
          config?.groupId || process.env.KAFKA_GROUP_ID
        }`,
      );

      config = config || { groupId: process.env.KAFKA_GROUP_ID };
      config.groupId = config.groupId || process.env.KAFKA_GROUP_ID;

      const consumer = new KafkajsConsumer(
        topic,
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
