import { Logger } from '@nestjs/common';

import retry from 'async-retry';
import {
  Consumer,
  ConsumerConfig,
  ConsumerSubscribeTopic,
  Kafka,
  KafkaMessage,
} from 'kafkajs';

import { sleep } from '../../../../auth/src/utils/sleep';
import { IConsumer } from '../../types/kafka.type';

export class KafkajsConsumer implements IConsumer {
  private readonly kafka: Kafka;
  private readonly consumer: Consumer;
  private readonly logger: Logger;

  constructor(
    private readonly topic: ConsumerSubscribeTopic,
    config: ConsumerConfig,
    broker: string,
  ) {
    this.kafka = new Kafka({
      clientId: `Consumer: ${process.env.KAFKA_CLIENT_ID}`,
      brokers: [broker],
    });
    this.consumer = this.kafka.consumer(config);
    this.logger = new Logger(
      `KafkajsConsumer - Topic: ${topic.topic}, Group: ${config.groupId}`,
    );
  }

  async consume(onMessage: (message: KafkaMessage) => Promise<void>) {
    try {
      this.logger.log(`Subscribing to topic: ${this.topic.topic}`);
      await this.consumer.subscribe(this.topic);
      this.logger.log(`Successfully subscribed to topic: ${this.topic.topic}`);

      await this.consumer.run({
        autoCommit: false,
        eachMessage: async ({ topic, partition, message }) => {
          const offset = message.offset;
          this.logger.debug(
            `Received message at partition ${partition}, offset ${offset}`,
          );

          try {
            // Process the message with retries
            await retry(async () => onMessage(message), {
              retries: 3,
              onRetry: (error, attempt) =>
                this.logger.warn(
                  `Retrying message consumption (attempt ${attempt}/3) for partition ${partition}, offset ${offset}`,
                  error,
                ),
            });

            // Commit the offset after successful processing
            await this.consumer.commitOffsets([
              {
                topic,
                partition,
                offset: (parseInt(offset, 10) + 1).toString(), // Commit the next offset
              },
            ]);

            this.logger.debug(
              `Successfully committed offset ${offset} for partition ${partition}`,
            );
          } catch (err) {
            this.logger.error(
              `Failed to process message at partition ${partition}, offset ${offset}. Adding to DLQ.`,
              err,
            );
            await this.addMessageToDlq(message);
          }
        },
      });
    } catch (err) {
      this.logger.error('Error starting consumer.', err);
      throw err;
    }
  }

  private async addMessageToDlq(message: KafkaMessage) {
    try {
      const valueString = message.value.toString('utf-8');
      let value = valueString;

      try {
        value = JSON.parse(valueString);
      } catch (error) {
        this.logger.warn(
          `Message value could not be parsed as JSON. Storing raw value. Error: ${error.message}`,
        );
      }

      const topic = this.topic.topic.toString();
      this.logger.log(`Adding message to DLQ:
                        Topic: ${topic}
                        Message: ${JSON.stringify(value)}
                        Offset: ${message.offset}
                        `);

      this.logger.log(
        `Message successfully added to DLQ. Topic: ${topic}, Offset: ${message.offset}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to add message to DLQ. Offset: ${message.offset}`,
        error,
      );
      throw new Error('Failed to save message to DLQ.');
    }
  }

  async connect() {
    try {
      this.logger.log('Connecting to Kafka broker...');
      await this.consumer.connect();
      this.logger.log('Successfully connected to Kafka broker.');
    } catch (err) {
      this.logger.error('Failed to connect to Kafka broker.', err);
      await sleep(5000);
      await this.connect();
    }
  }

  async disconnect() {
    try {
      this.logger.log('Disconnecting from Kafka broker...');
      await this.consumer.disconnect();
      this.logger.log('Successfully disconnected from Kafka broker.');
    } catch (err) {
      this.logger.error('Error disconnecting from Kafka broker.', err);
    }
  }
}
