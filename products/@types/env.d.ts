declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: string;
      DATABASE_URL: string;
      AT_SECRET: string;
      RT_SECRET: string;
      KAFKA_BROKER: string;
      KAFKA_GROUP_ID: string;
      KAFKA_CLIENT_ID: string;
    }
  }
}

export {}
