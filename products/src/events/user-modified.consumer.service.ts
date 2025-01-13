import { Injectable } from '@nestjs/common';

import { Consumer, Topics, UserModifiedEvent } from '@microservicess/common';
import { Status } from '@prisma/client';
import { KafkaMessage } from 'kafkajs';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserModifiedConsumer extends Consumer<UserModifiedEvent> {
  readonly topic = Topics.UserModified;

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async onMessage(data: UserModifiedEvent['data'], message: KafkaMessage) {
    console.log('Dataa:', data);

    const existingUser = await this.prisma.users.findUnique({
      where: { email: data.email },
    });

    const referenceId = parseInt(data.id);
    delete data.id;

    if (existingUser) {
      try {
        await this.prisma.users.update({
          where: {
            referenceId,
          },
          data: {
            ...data,
            status: data.status as Status,
          },
        });
        console.log(
          `User with email ${data.email} has been updated successfully.`,
        );
      } catch (error) {
        console.error(`Failed to update user: ${error.message}`);
      }

      return;
    }

    try {
      await this.prisma.users.create({
        data: {
          referenceId: parseInt(data.id),
          name: data.name,
          email: data.email,
          hashedRt: data.hashedRt,
          status: data.status as Status,
          updatedAt: data.updatedAt,
        },
      });

      console.log(`User with email ${data.email} created successfully.`);
      const allUsers = await this.prisma.users.findMany();
      console.log('USERS:', allUsers);
    } catch (error) {
      console.error(`Failed to create user: ${error.message}`);
    }
  }
}
