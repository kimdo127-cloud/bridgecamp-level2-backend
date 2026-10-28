import { randomBytes } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { hashPassword } from './auth.js';
import { DB_SCHEMA } from './db.js';
import { Application, ChatLog, Cohort, Course, CourseView, Inquiry, User } from './entities.js';
import { SEED_APPLICATIONS, SEED_CHATS, SEED_COHORTS, SEED_COURSES, SEED_INQUIRIES, SEED_USERS, SEED_VIEWS } from './seed-data.js';
import { dayBefore, todayKST } from './validation.js';

const TABLES = ['chat_logs', 'inquiries', 'course_views', 'applications', 'cohorts', 'courses', 'users'];

function addDays(date: string, days: number) {
  return new Date(Date.parse(date) + days * 86_400_000).toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000);
}

// 가상 데이터를 처음 상태로 다시 채운다. npm run seed와 운영 화면의 "다시 채우기" 버튼이 함께 쓴다
export async function seedDatabase(db: DataSource) {
  const today = todayKST();
  const counts = await db.transaction(async (tx) => {
    await tx.query(`TRUNCATE ${TABLES.map((t) => `"${DB_SCHEMA}"."${t}"`).join(', ')} RESTART IDENTITY CASCADE`);

    const users = new Map<string, User>();
    for (const { key, password, ...u } of SEED_USERS) {
      const passwordHash = hashPassword(password ?? randomBytes(12).toString('hex'));
      users.set(key, await tx.getRepository(User).save(tx.getRepository(User).create({ ...u, passwordHash })));
    }

    const courseIds: number[] = [];
    for (const { id: _id, createdAt: _createdAt, ...c } of SEED_COURSES) {
      courseIds.push((await tx.getRepository(Course).save(tx.getRepository(Course).create(c))).id);
    }

    const cohortIds: number[] = [];
    for (const c of SEED_COHORTS) {
      const startDate = addDays(today, c.start);
      const cohort = tx.getRepository(Cohort).create({
        courseId: courseIds[c.courseId - 1],
        cohortNo: c.cohortNo,
        startDate,
        endDate: addDays(today, c.end),
        applyDeadline: c.deadline === undefined ? dayBefore(startDate) : addDays(today, c.deadline),
        capacity: c.capacity,
        schedule: c.schedule,
      });
      cohortIds.push((await tx.getRepository(Cohort).save(cohort)).id);
    }

    for (const a of SEED_APPLICATIONS) {
      await tx.getRepository(Application).save(
        tx.getRepository(Application).create({
          cohortId: cohortIds[a.cohort],
          userId: users.get(a.user)!.id,
          status: a.cancelled ? 'cancelled' : 'applied',
          createdAt: daysAgo(a.daysAgo),
          cancelledAt: a.cancelled ? daysAgo(Math.max(a.daysAgo - 1, 0)) : null,
        }),
      );
    }

    const views = SEED_VIEWS.flatMap((n, i) => Array.from({ length: n }, (_, k) => ({ courseId: courseIds[i], createdAt: daysAgo(k % 14) })));
    await tx.getRepository(CourseView).insert(views);

    for (const q of SEED_INQUIRIES) {
      await tx.getRepository(Inquiry).save(
        tx.getRepository(Inquiry).create({ userId: users.get(q.user)!.id, courseId: courseIds[q.course - 1], message: q.message, chatQuestion: q.chatQuestion, createdAt: daysAgo(q.daysAgo) }),
      );
    }
    for (const c of SEED_CHATS) {
      await tx.getRepository(ChatLog).save(
        tx.getRepository(ChatLog).create({ userId: c.user ? users.get(c.user)!.id : null, question: c.question, answer: c.answer, needsHuman: c.needsHuman, createdAt: daysAgo(c.daysAgo) }),
      );
    }

    return { courses: courseIds.length, cohorts: cohortIds.length, users: users.size, applications: SEED_APPLICATIONS.length };
  });
  return counts;
}
