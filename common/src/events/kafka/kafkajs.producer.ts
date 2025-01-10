import { Logger } from '@nestjs/common';

import retry from 'async-retry';
import { Kafka, Message, Producer } from 'kafkajs';

import { IProducer } from '../../types/kafka.type';
import { sleep } from '../../utils/sleep';

export class KafkajsProducer implements IProducer {
  private readonly kafka: Kafka;
  private readonly producer: Producer;
  private readonly logger: Logger;

  constructor(
    private readonly topic: string,
    broker: string,
  ) {
    if (!topic) {
      throw new Error('Topic name is required');
    }
    if (!broker) {
      throw new Error('Kafka broker is required');
    }

    this.kafka = new Kafka({
      clientId: `Producer: ${process.env.KAFKA_CLIENT_ID}`,
      brokers: [broker],
    });

    this.producer = this.kafka.producer();
    this.logger = new Logger(`Producer-${topic}`);
  }

  async produce(message: Message) {
    if (!message || !message.value) {
      throw new Error('Message must contain a value');
    }

    try {
      await retry(
        async () => {
          await this.producer.send({
            topic: this.topic,
            messages: [message],
          });
        },
        {
          retries: 3,
          onRetry: (err, attempt) => {
            this.logger.warn(
              `Retrying message production (attempt ${attempt}/3)`,
              err,
            );
          },
        },
      );
    } catch (err) {
      this.logger.error(
        `Failed to produce message to topic ${this.topic}`,
        err,
      );
      throw err;
    }
  }

  async connect() {
    try {
      await this.producer.connect();
      this.logger.log(`Connected to Kafka broker for topic: ${this.topic}`);
    } catch (err) {
      this.logger.error('Failed to connect to Kafka.', err);
      await sleep(5000);
      await this.connect();
    }
  }

  async disconnect() {
    await this.producer.disconnect();
    this.logger.log(`Disconnected from Kafka broker for topic: ${this.topic}`);
  }
}
