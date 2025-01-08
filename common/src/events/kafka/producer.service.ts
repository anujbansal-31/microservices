import { Injectable, OnApplicationShutdown } from '@nestjs/common';

import { Message } from 'kafkajs';

import { IProducer } from '../../types/kafka.type';
import { KafkajsProducer } from './kafkajs.producer';

interface Event {
  topic: string;
  data: any;
}

export abstract class Producer<T extends Event> {
  abstract topic: T['topic'];

  constructor(protected readonly producerService: ProducerService) {}

  async publish(data: T['data']): Promise<void> {
    await this.producerService.produce(this.topic, {
      value: JSON.stringify(data),
    });
  }
}

@Injectable()
class ProducerService implements OnApplicationShutdown {
  private readonly producers = new Map<string, IProducer>();

  async produce(topic: string, message: Message) {
    const producer = await this.getProducer(topic);
    await producer.produce(message);
  }

  private async getProducer(topic: string) {
    let producer = this.producers.get(topic);
    if (!producer) {
      producer = new KafkajsProducer(topic, process.env.KAFKA_BROKER);
      await producer.connect();
      this.producers.set(topic, producer);
    }
    return producer;
  }

  async onApplicationShutdown() {
    for (const producer of this.producers.values()) {
      await producer.disconnect();
    }
  }
}
