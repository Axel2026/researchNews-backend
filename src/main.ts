import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { env } from './env';

const app = await NestFactory.create(AppModule, {
  bodyParser: false,
  cors: {
    origin: env.CORS_ORIGIN,
    allowedHeaders: ['Authorization', 'Content-Type'],
    methods: ['GET', 'PUT', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  },
});

app.getHttpAdapter().getInstance().disable('x-powered-by');

await app.listen(env.PORT);
console.log(`API listening on http://localhost:${env.PORT}`);
