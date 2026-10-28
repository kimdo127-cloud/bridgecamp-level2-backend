import 'dotenv/config';
import { DataSource } from 'typeorm';
import { dataSourceOptions, DB_SCHEMA, ensureSchema } from './db.js';
import { seedDatabase } from './seeder.js';

// 가상 데이터를 처음 상태로 다시 채운다 (운영 화면의 "다시 채우기" 버튼과 같은 동작)
async function seed() {
  await ensureSchema();
  const db = await new DataSource(dataSourceOptions()).initialize();
  const c = await seedDatabase(db);
  console.log(`가상 데이터를 넣었어요: 과정 ${c.courses}개, 기수 ${c.cohorts}개, 계정 ${c.users}개, 신청 ${c.applications}건 (스키마 ${DB_SCHEMA})`);
  await db.destroy();
}
await seed();
