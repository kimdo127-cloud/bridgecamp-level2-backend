import { BadRequestException, Body, Controller, Get, Headers, Injectable, NotFoundException, Param, Post } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, IsNull } from 'typeorm';
import { AuthService } from './auth.js';
import { ChatService } from './chat.js';
import { GUEST_CHAT_RETENTION_DAYS, parseVisitorId } from './privacy.js';
import { CoursesService } from './courses.service.js';
import { DB_SCHEMA } from './db.js';
import { AdminReply, ChatLog, Course, CourseView, Inquiry, User } from './entities.js';
import { seedDatabase } from './seeder.js';
import { todayKST } from './validation.js';

const CLOSING_SOON_DAYS = 7;

type ThreadItem =
  | { type: 'chat'; id: number; at: Date; text: string; answer: string; needsHuman: boolean }
  | { type: 'inquiry'; id: number; at: Date; text: string; courseTitle: string | null }
  | { type: 'reply'; id: number; at: Date; text: string };
type Thread = { key: string; kind: 'member' | 'visitor'; label: string; items: ThreadItem[] };

function addDays(date: string, days: number) {
  return new Date(Date.parse(date) + days * 86_400_000).toISOString().slice(0, 10);
}

@Injectable()
export class AdminService {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly courses: CoursesService,
    private readonly chat: ChatService,
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

  // 문의 내역: 사람 한 명을 대화 한 묶음(스레드)으로 만든다.
  // 로그인 탭은 수강생 계정별(챗봇 질문 + 운영팀 문의 + 운영팀 답변), 비로그인 탭은 브라우저 방문자 ID별(챗봇 질문)
  async threads() {
    // 보관 기간이 지난 비로그인 챗봇 기록은 지우고(동시에 실행), 목록에서도 한 번 더 걸러 낸다
    const guestCutoff = Date.now() - GUEST_CHAT_RETENTION_DAYS * 86_400_000;
    const [, inquiries, allChats, replies, courses] = await Promise.all([
      this.chat.purgeOldGuestChats(),
      this.db.getRepository(Inquiry).find({ relations: { user: true }, order: { createdAt: 'ASC' } }),
      this.db.getRepository(ChatLog).find({ relations: { user: true }, order: { createdAt: 'ASC' } }),
      this.db.getRepository(AdminReply).find({ relations: { user: true }, order: { createdAt: 'ASC' } }),
      this.db.getRepository(Course).find({ select: { id: true, title: true } }),
    ]);
    const chats = allChats.filter((c) => c.user || c.createdAt.getTime() >= guestCutoff);
    const courseTitles = new Map(courses.map((c) => [c.id, c.title]));

    const threads = new Map<string, Thread>();
    const thread = (key: string, kind: Thread['kind'], label: string) => {
      let t = threads.get(key);
      if (!t) {
        t = { key, kind, label, items: [] };
        threads.set(key, t);
      }
      return t;
    };
    for (const c of chats) {
      const t = c.user
        ? thread(`m-${c.user.id}`, 'member', c.user.name)
        : c.visitorId
          ? thread(`v-${c.visitorId}`, 'visitor', `방문자 #${c.visitorId.slice(0, 4).toUpperCase()}`)
          : thread(`u-${c.id}`, 'visitor', '방문자 (구분 불가)');
      t.items.push({ type: 'chat', id: c.id, at: c.createdAt, text: c.question, answer: c.answer, needsHuman: c.needsHuman });
    }
    for (const q of inquiries) {
      thread(`m-${q.user.id}`, 'member', q.user.name).items.push({
        type: 'inquiry',
        id: q.id,
        at: q.createdAt,
        text: q.message,
        courseTitle: q.courseId ? (courseTitles.get(q.courseId) ?? null) : null,
      });
    }
    for (const r of replies) {
      if (r.user) thread(`m-${r.user.id}`, 'member', r.user.name).items.push({ type: 'reply', id: r.id, at: r.createdAt, text: r.message });
      else if (r.visitorId && threads.has(`v-${r.visitorId}`)) threads.get(`v-${r.visitorId}`)!.items.push({ type: 'reply', id: r.id, at: r.createdAt, text: r.message });
    }

    const summarize = (t: Thread) => {
      t.items.sort((a, b) => a.at.getTime() - b.at.getTime());
      const last = t.items[t.items.length - 1];
      const lastReplyAt = Math.max(0, ...t.items.filter((i) => i.type === 'reply').map((i) => i.at.getTime()));
      // 답변 대기: 마지막 운영팀 답변 뒤에 운영팀 문의나 "운영팀 확인 필요" 챗봇 질문이 있으면
      const waiting = t.items.some((i) => i.at.getTime() > lastReplyAt && (i.type === 'inquiry' || (i.type === 'chat' && i.needsHuman)));
      const answered = lastReplyAt > 0;
      return {
        key: t.key,
        kind: t.kind,
        label: t.label,
        lastAt: last.at,
        preview: last.type === 'reply' ? `운영팀: ${last.text}` : last.text,
        count: t.items.filter((i) => i.type !== 'reply').length,
        status: waiting ? 'waiting' : answered ? 'answered' : null,
        items: t.items,
      };
    };
    const all = [...threads.values()].map(summarize).sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
    return {
      retentionDays: GUEST_CHAT_RETENTION_DAYS,
      member: all.filter((t) => t.kind === 'member'),
      visitor: all.filter((t) => t.kind === 'visitor'),
    };
  }

  // 운영 매니저가 답변을 보낸다. 로그인 수강생은 계정으로, 비로그인 방문자는 브라우저 방문자 ID로 전달된다
  async reply(admin: User, key: string, body: unknown) {
    const b = (body ?? {}) as Record<string, unknown>;
    const message = typeof b.message === 'string' ? b.message.trim() : '';
    if (message.length < 2 || message.length > 1000) {
      throw new BadRequestException({ message: '입력한 내용을 다시 확인해 주세요.', errors: { message: '답변을 2자 이상, 1000자 이내로 적어 주세요.' } });
    }
    const repo = this.db.getRepository(AdminReply);
    const member = /^m-(\d+)$/.exec(key);
    if (member) {
      const user = await this.db.getRepository(User).findOneBy({ id: Number(member[1]) });
      if (!user || user.role !== 'member') throw new NotFoundException({ message: '찾는 수강생이 없어요.' });
      const saved = await repo.save(repo.create({ userId: user.id, adminId: admin.id, message }));
      // 답변을 보내면 그 수강생의 열린 문의는 처리 완료로 바꾼다
      await this.db.getRepository(Inquiry).update({ userId: user.id, status: 'open' }, { status: 'done' });
      return { id: saved.id, message: '답변을 보냈어요. 수강생의 "내 신청"과 챗봇 창에 표시돼요.' };
    }
    const visitorId = parseVisitorId(key.replace(/^v-/, ''));
    if (!key.startsWith('v-') || !visitorId || !(await this.db.getRepository(ChatLog).existsBy({ visitorId, userId: IsNull() }))) {
      throw new NotFoundException({ message: '답변할 대화를 찾지 못했어요. 보관 기간이 지나 지워졌을 수 있어요.' });
    }
    const saved = await repo.save(repo.create({ userId: null, visitorId, adminId: admin.id, message }));
    return { id: saved.id, message: '답변을 보냈어요. 방문자가 같은 브라우저로 챗봇을 열면 보여요.' };
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
    return this.admin.threads();
  }

  @Post('inquiries/:key/replies')
  async reply(@Headers('authorization') authorization: string | undefined, @Param('key') key: string, @Body() body: unknown) {
    const admin = await this.auth.require(authorization, 'admin');
    return this.admin.reply(admin, key, body);
  }

  // 가상 데이터를 처음 상태로 다시 채운다 (계정도 처음 상태로 돌아간다)
  @Post('reset')
  async reset(@Headers('authorization') authorization?: string) {
    await this.auth.require(authorization, 'admin');
    const counts = await this.admin.reset();
    return { message: '가상 데이터를 처음 상태로 다시 채웠어요.', ...counts };
  }
}
