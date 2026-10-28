import { BadRequestException, Body, Controller, Headers, Injectable, Post } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthService } from './auth.js';
import { CoursesService } from './courses.service.js';
import { ChatLog, Course, Inquiry, type User } from './entities.js';
import { todayKST } from './validation.js';

const MODEL = process.env.GPT_MODEL || 'gpt-4.1-mini';
const MAX_QUESTION = 300;
const MAX_HISTORY = 6;

type Turn = { role: 'user' | 'assistant'; content: string };

const SYSTEM_PROMPT = `너는 IT·AI 교육 회사 "브릿지캠프"의 수강 상담 챗봇이야.
- 반드시 아래 [과정 정보] 안의 내용만 근거로 답해. 정보에 없는 내용(환불, 할인, 출결 기준, 수료증, 세금계산서 등)은 지어내지 말고 운영팀 확인이 필요하다고 말해.
- 개강일, 신청 마감일, 수강료, 남은 자리 같은 숫자는 정보에 적힌 값을 그대로 써.
- 신청할 수 있는지는 "신청 가능" 표시로 판단해. 정원이 찼거나 마감된 기수는 다른 기수를 권해.
- 한국어로, 수강 희망자에게 말하듯 친절하고 짧게 (3~5문장) 답해. 마크다운 표나 제목은 쓰지 마.
- 답과 관련된 과정의 id를 courseIds에 넣어. (최대 3개)
- 정보만으로 답할 수 없으면 needsHuman을 true로 해.
반드시 JSON으로만 답해: {"answer": "...", "courseIds": [1, 2], "needsHuman": false}`;

@Injectable()
export class ChatService {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly courses: CoursesService,
  ) {}

  // 질문할 때마다 DB의 최신 과정·기수 정보를 GPT에 함께 보낸다 (남은 자리가 바뀌어도 바로 반영)
  private async context() {
    const today = todayKST();
    const list = await this.courses.list();
    const rows = list.map((c) => ({
      id: c.id,
      과정: c.title,
      분야: c.category,
      난이도: c.level,
      방식: c.format,
      수강료: c.price === 0 ? '무료' : `${c.price.toLocaleString('ko-KR')}원`,
      한줄소개: c.summary,
      추천대상: c.recommendedFor.split('\n'),
      준비사항: c.preparation,
      강사: c.instructorName,
      기수: c.cohorts
        .filter((h) => h.endDate >= today)
        .map((h) => ({
          기수: `${h.cohortNo}기`,
          개강: h.startDate,
          종강: h.endDate,
          수업시간: h.schedule,
          신청마감: h.applyDeadline,
          정원: h.capacity,
          남은자리: h.remaining,
          상태: h.startDate <= today ? '진행 중' : h.applyDeadline < today ? '신청 마감' : h.remaining === 0 ? '정원 마감' : '신청 가능',
        })),
    }));
    return `오늘 날짜: ${today}\n[과정 정보]\n${JSON.stringify(rows)}`;
  }

  async ask(user: User | null, body: unknown) {
    const b = (body ?? {}) as Record<string, unknown>;
    const question = typeof b.message === 'string' ? b.message.trim() : '';
    if (!question) throw new BadRequestException({ message: '궁금한 점을 입력해 주세요.' });
    if (question.length > MAX_QUESTION) throw new BadRequestException({ message: `질문은 ${MAX_QUESTION}자 이내로 적어 주세요.` });

    const history: Turn[] = (Array.isArray(b.history) ? b.history : [])
      .filter((t): t is Turn => !!t && (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string')
      .slice(-MAX_HISTORY)
      .map((t) => ({ role: t.role, content: t.content.slice(0, 600) }));

    let result: { answer: string; courseIds: number[]; needsHuman: boolean };
    try {
      result = await this.callGpt([{ role: 'system', content: `${SYSTEM_PROMPT}\n\n${await this.context()}` }, ...history, { role: 'user', content: question }]);
    } catch (e) {
      console.error('GPT 호출 실패:', e instanceof Error ? e.message : e);
      result = { answer: '지금은 답변을 만들지 못했어요. 잠시 뒤 다시 물어보시거나 운영팀에 문의를 남겨 주세요.', courseIds: [], needsHuman: true };
    }

    // GPT가 돌려준 과정 번호 중 실제로 있는 것만 링크로 보여 준다
    const ids = result.courseIds.length ? await this.db.getRepository(Course).findBy(result.courseIds.map((id) => ({ id }))) : [];
    const courses = ids.map((c) => ({ id: c.id, title: c.title, category: c.category }));

    await this.db.getRepository(ChatLog).insert({ userId: user?.id ?? null, question, answer: result.answer, needsHuman: result.needsHuman });
    return { answer: result.answer, courses, needsHuman: result.needsHuman };
  }

  private async callGpt(messages: { role: string; content: string }[]) {
    const key = process.env.GPT_API_KEY;
    if (!key) throw new Error('GPT_API_KEY가 없어요');
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, messages, temperature: 0.3, max_tokens: 500, response_format: { type: 'json_object' } }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    const parsed = JSON.parse(data.choices[0].message.content) as Record<string, unknown>;
    return {
      answer: typeof parsed.answer === 'string' && parsed.answer.trim() ? parsed.answer.trim() : '답변을 만들지 못했어요. 운영팀에 문의를 남겨 주세요.',
      courseIds: (Array.isArray(parsed.courseIds) ? parsed.courseIds : []).map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 3),
      needsHuman: parsed.needsHuman === true,
    };
  }

  // 챗봇이 답하지 못한 질문 등을 운영팀 문의로 남긴다 (수강생만)
  async inquire(user: User, body: unknown) {
    const b = (body ?? {}) as Record<string, unknown>;
    const message = typeof b.message === 'string' ? b.message.trim() : '';
    const chatQuestion = typeof b.chatQuestion === 'string' ? b.chatQuestion.trim().slice(0, MAX_QUESTION) : '';
    const courseId = Number(b.courseId);
    if (message.length < 5 || message.length > 500) {
      throw new BadRequestException({ message: '입력한 내용을 다시 확인해 주세요.', errors: { message: '문의 내용을 5자 이상, 500자 이내로 적어 주세요.' } });
    }
    const course = Number.isInteger(courseId) && courseId > 0 ? await this.db.getRepository(Course).findOneBy({ id: courseId }) : null;
    const saved = await this.db.getRepository(Inquiry).save(this.db.getRepository(Inquiry).create({ userId: user.id, courseId: course?.id ?? null, message, chatQuestion }));
    return { id: saved.id, message: '문의를 남겼어요. 운영팀이 평일 하루 안에 연락드릴게요.' };
  }
}

@Controller()
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly auth: AuthService,
  ) {}

  // 로그인하지 않아도 물어볼 수 있다. 로그인했다면 누가 물었는지 기록한다
  @Post('chat')
  async ask(@Headers('authorization') authorization: string | undefined, @Body() body: unknown) {
    return this.chat.ask(await this.auth.optional(authorization), body);
  }

  @Post('inquiries')
  async inquire(@Headers('authorization') authorization: string | undefined, @Body() body: unknown) {
    const user = await this.auth.require(authorization, 'member');
    return this.chat.inquire(user, body);
  }
}
