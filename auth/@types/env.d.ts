declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: string;
      DATABASE_URL: string;
      AT_SECRET: string;
      RT_SECRET: string;
    }
  }
}

export {}
