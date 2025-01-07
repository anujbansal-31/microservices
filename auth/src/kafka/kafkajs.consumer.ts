import { Logger } from '@nestjs/common';

import retry from 'async-retry';
import {
  Consumer,
  ConsumerConfig,
  ConsumerSubscribeTopic,
  Kafka,
  KafkaMessage,
} from 'kafkajs';
import { PrismaService } from 'src/prisma/prisma.service';

import { sleep } from '../utils/sleep';
import { IConsumer } from './consumer.interface';

export class KafkajsConsumer implements IConsumer {
  private readonly kafka: Kafka;
  private readonly consumer: Consumer;
  private readonly logger: Logger;

  constructor(
    private readonly topic: ConsumerSubscribeTopic,
    private readonly prisma: PrismaService,
    config: ConsumerConfig,
    broker: string,
  ) {
    this.kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID,
      brokers: [broker],
    });
    this.consumer = this.kafka.consumer(config);
    this.logger = new Logger(`${topic.topic}-${config.groupId}`);
  }

  async consume(onMessage: (message: KafkaMessage) => Promise<void>) {
    await this.consumer.subscribe(this.topic);
    await this.consumer.run({
      eachMessage: async ({ message, partition }) => {
        this.logger.debug(`Processing message partition: ${partition}`);
        try {
          await retry(async () => onMessage(message), {
            retries: 3,
            onRetry: (error, attempt) =>
              this.logger.error(
                `Error consuming message, executing retry ${attempt}/3...`,
                error,
              ),
          });
        } catch (err) {
          this.logger.error(
            'Error consuming message. Adding to dead letter queue...',
            err,
          );
          await this.addMessageToDlq(message);
        }
      },
    });
  }

  private async addMessageToDlq(message: KafkaMessage) {
    try {
      // Ensure the value is a JSON-compatible object
      const valueString = message.value.toString('utf-8');
      const valueJson = JSON.parse(valueString);

      const topic = this.topic.topic.toString();

      await this.prisma.dlq.create({
        data: {
          value: valueJson,
          topic: topic,
        },
      });
    } catch (error) {
      console.error('Failed to process message for DLQ:', error);
      throw new Error('Invalid message format. Could not save to DLQ.');
    }
  }

  async connect() {
    try {
      await this.consumer.connect();
    } catch (err) {
      this.logger.error('Failed to connect to Kafka.', err);
      await sleep(5000);
      await this.connect();
    }
  }

  async disconnect() {
    await this.consumer.disconnect();
  }
}
