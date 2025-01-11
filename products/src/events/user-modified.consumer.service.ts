import { Injectable } from '@nestjs/common';

import { Consumer, Topics, UserModifiedEvent } from '@microservicess/common';
import { Status } from '@prisma/client';
import { KafkaMessage } from 'kafkajs';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserModifiedConsumer extends Consumer<UserModifiedEvent> {
  readonly topic = Topics.UserModified;

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async onMessage(data: UserModifiedEvent['data'], message: KafkaMessage) {
    console.log('Dataa:', data);
    await this.prisma.users.create({
      data: {
        userId: parseInt(data.id),
        name: data.name,
        email: data.email,
        hashedRt: data.hashedRt,
        status: data.status as Status,
        updatedAt: data.updatedAt,
      },
    });
    console.log(await this.prisma.users.findMany());
  }
}
