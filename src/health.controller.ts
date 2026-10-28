import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { Response } from 'express';
import { DataSource } from 'typeorm';
import { DB_SCHEMA } from './db.js';

@Controller()
export class HealthController {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  @Get()
  root() {
    return { service: 'bridgecamp-level2-backend', health: '/health', courses: '/courses' };
  }

  // 서버와 DB 연결 상태. DB가 끊기면 503과 함께 disconnected를 돌려준다
  @Get('health')
  async health(@Res() res: Response) {
    const checkedAt = new Date().toISOString();
    try {
      await this.db.query('SELECT 1');
      res.status(HttpStatus.OK).json({ status: 'ok', db: 'connected', schema: DB_SCHEMA, checkedAt });
    } catch {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({ status: 'error', db: 'disconnected', checkedAt });
    }
  }
}
