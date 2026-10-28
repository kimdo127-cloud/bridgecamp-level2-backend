import pg from 'pg';
import type { DataSourceOptions } from 'typeorm';
import { Application, ChatLog, Cohort, Course, CourseView, Inquiry, User } from './entities.js';

// 이 과제가 쓰는 DB 안의 공간(스키마). 두 번째 과제는 다른 이름을 써서 테이블이 섞이지 않게 한다.
export const DB_SCHEMA = process.env.DB_SCHEMA || 'level2';

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL이 없어요. backend/.env 파일에 DB 주소를 넣어 주세요.');
  return url;
}

// Render 외부 주소는 SSL이 필요하고, Render 안에서 쓰는 내부 주소(호스트에 점이 없음)는 필요 없다
function needsSsl(url: string) {
  return new URL(url).hostname.includes('.');
}

export function dataSourceOptions(): DataSourceOptions {
  const url = databaseUrl();
  return {
    type: 'postgres',
    url,
    schema: DB_SCHEMA,
    ssl: needsSsl(url) ? { rejectUnauthorized: false } : false,
    entities: [Course, Cohort, User, Application, CourseView, Inquiry, ChatLog],
    // 작은 과제라 마이그레이션 대신 엔티티 정의대로 테이블을 맞춘다
    synchronize: true,
  };
}

export async function ensureSchema() {
  const url = databaseUrl();
  const client = new pg.Client({ connectionString: url, ssl: needsSsl(url) ? { rejectUnauthorized: false } : undefined });
  await client.connect();
  await client.query(`CREATE SCHEMA IF NOT EXISTS "${DB_SCHEMA}"`);
  await client.end();
}
