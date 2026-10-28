import { Controller, Get, Headers, Injectable, Post } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthService } from './auth.js';
import { CoursesService } from './courses.service.js';
import { DB_SCHEMA } from './db.js';
import { ChatLog, CourseView, Inquiry } from './entities.js';
import { seedDatabase } from './seeder.js';
import { todayKST } from './validation.js';

const CLOSING_SOON_DAYS = 7;

function addDays(date: string, days: number) {
  return new Date(Date.parse(date) + days * 86_400_000).toISOString().slice(0, 10);
}

@Injectable()
export class AdminService {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly courses: CoursesService,
  ) {}

  // 운영 현황: 숫자 3개 + 과정별 신청 전환 현황
  async stats() {
    const today = todayKST();
    const courses = await this.courses.list();

    // 오늘(한국 시간) 들어온 신청 중 지금도 유지 중인 것
    const [{ count: todayApplications }] = await this.db.query(
      `SELECT COUNT(*)::int AS count FROM "${DB_SCHEMA}".applications WHERE status = 'applied' AND (created_at AT TIME ZONE 'Asia/Seoul')::date = $1`,
      [today],
    );

    // 지금 신청할 수 있는 기수: 개강 전이고 신청 마감일이 지나지 않음
    const openCohorts = courses.flatMap((c) => c.cohorts.filter((h) => h.startDate > today && h.applyDeadline >= today).map((h) => ({ ...h, courseTitle: c.title })));
    const remainingSeats = openCohorts.reduce((sum, h) => sum + h.remaining, 0);
    const closingSoon = openCohorts.filter((h) => h.applyDeadline <= addDays(today, CLOSING_SOON_DAYS) && h.remaining > 0);

    const views: { courseId: number; count: number }[] = await this.db
      .getRepository(CourseView)
      .createQueryBuilder('v')
      .select('v.courseId', 'courseId')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('v.courseId')
      .getRawMany();
    const viewMap = new Map(views.map((v) => [Number(v.courseId), Number(v.count)]));

    const conversion = courses
      .map((c) => {
        const viewCount = viewMap.get(c.id) ?? 0;
        const applied = c.cohorts.reduce((sum, h) => sum + h.appliedCount, 0);
        return { courseId: c.id, title: c.title, views: viewCount, applications: applied, rate: viewCount ? Math.round((applied / viewCount) * 1000) / 10 : 0 };
      })
      .sort((a, b) => b.views - a.views);

    return {
      today,
      todayApplications: Number(todayApplications),
      remainingSeats,
      closingSoonCount: closingSoon.length,
      closingSoon: closingSoon.map((h) => ({ cohortId: h.id, courseId: h.courseId, courseTitle: h.courseTitle, cohortNo: h.cohortNo, applyDeadline: h.applyDeadline, remaining: h.remaining })),
      conversion,
    };
  }

  async inquiries() {
    const inquiries = await this.db.getRepository(Inquiry).find({ relations: { user: true }, order: { createdAt: 'DESC' }, take: 50 });
    const chats = await this.db.getRepository(ChatLog).find({ relations: { user: true }, order: { createdAt: 'DESC' }, take: 50 });
    const courseTitles = new Map((await this.courses.list()).map((c) => [c.id, c.title]));
    return {
      inquiries: inquiries.map((q) => ({
        id: q.id,
        userName: q.user.name,
        courseTitle: q.courseId ? (courseTitles.get(q.courseId) ?? null) : null,
        message: q.message,
        chatQuestion: q.chatQuestion,
        status: q.status,
        createdAt: q.createdAt,
      })),
      chats: chats.map((c) => ({ id: c.id, userName: c.user?.name ?? null, question: c.question, answer: c.answer, needsHuman: c.needsHuman, createdAt: c.createdAt })),
    };
  }

  reset() {
    return seedDatabase(this.db);
  }
}

// 운영 매니저만 쓰는 기능
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly auth: AuthService,
  ) {}

  @Get('stats')
  async stats(@Headers('authorization') authorization?: string) {
    await this.auth.require(authorization, 'admin');
    return this.admin.stats();
  }

  @Get('inquiries')
  async inquiries(@Headers('authorization') authorization?: string) {
    await this.auth.require(authorization, 'admin');
    return this.admin.inquiries();
  }

  // 가상 데이터를 처음 상태로 다시 채운다 (계정도 처음 상태로 돌아간다)
  @Post('reset')
  async reset(@Headers('authorization') authorization?: string) {
    await this.auth.require(authorization, 'admin');
    const counts = await this.admin.reset();
    return { message: '가상 데이터를 처음 상태로 다시 채웠어요.', ...counts };
  }
}
