import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { PrismaClient } from '.prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const url = process.env.DATABASE_URL;

    super({
      datasources: {
        db: {
          url,
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') return;

    // Truncate the users table and reset its ID sequence
    await this.$executeRawUnsafe(`
    DO $$
    BEGIN
      -- Check if the "users" table exists
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        TRUNCATE TABLE "users" RESTART IDENTITY CASCADE;
      END IF;
    END $$;
  `);
  }
}
