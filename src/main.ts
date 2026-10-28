import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { ensureSchema } from './db.js';

async function bootstrap() {
  await ensureSchema();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // 대표 사진(data URL)을 함께 받으므로 요청 크기 한도를 기본 100KB에서 늘린다
  app.useBodyParser('json', { limit: '2mb' });

  // 프론트엔드 주소에서 오는 요청만 받는다. 여러 개면 쉼표로 구분 (예: http://localhost:3100,https://xxx.vercel.app)
  const origins = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:3200')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins, methods: ['GET', 'POST', 'PATCH'], allowedHeaders: ['Content-Type', 'Authorization'] });

  await app.listen(process.env.PORT ?? 4200);
}
await bootstrap();
