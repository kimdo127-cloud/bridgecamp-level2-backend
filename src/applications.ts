import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Headers, Injectable, NotFoundException, Param, Post } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthService } from './auth.js';
import { parseId } from './courses.controller.js';
import { Application, Cohort, type User } from './entities.js';
import { todayKST } from './validation.js';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// "2026-11-02" → "11월 2일 (월)"
function koreanDate(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${WEEKDAYS[d.getUTCDay()]})`;
}

// 규칙에 걸리면 409와 함께 이유(rule)와 쉬운 안내(message)를 돌려준다
function reject(rule: string, message: string): never {
  throw new ConflictException({ message, rule });
}

@Injectable()
export class ApplicationsService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  // 수강 신청. 정원(R1)·중복(R2)·신청 기간(R3)을 백엔드가 확인한다.
  // 기수 줄을 잠근 채로 확인하고 저장해서, 동시에 신청이 몰려도 정원을 넘지 않는다.
  async apply(user: User, body: unknown) {
    const b = (body ?? {}) as Record<string, unknown>;
    const cohortId = Number(b.cohortId);
    if (!Number.isInteger(cohortId) || cohortId < 1) throw new BadRequestException({ message: '신청할 기수를 골라 주세요.', errors: { cohortId: '신청할 기수를 골라 주세요.' } });

    const saved = await this.db.transaction(async (tx) => {
      const cohort = await tx.getRepository(Cohort).createQueryBuilder('h').setLock('pessimistic_write').where('h.id = :id', { id: cohortId }).getOne();
      if (!cohort) throw new NotFoundException({ message: '찾는 기수가 없어요.' });

      const today = todayKST();
      if (cohort.startDate <= today) reject('period', '이미 개강한 기수예요. 다음 기수를 확인해 주세요.');
      if (cohort.applyDeadline < today) reject('period', `신청 기간이 끝났어요. (마감 ${koreanDate(cohort.applyDeadline)})`);

      const repo = tx.getRepository(Application);
      const mine = await repo.findOneBy({ cohortId, userId: user.id, status: 'applied' });
      if (mine) reject('duplicate', '이미 신청한 기수예요. 내 신청에서 확인해 주세요.');

      const applied = await repo.countBy({ cohortId, status: 'applied' });
      if (applied >= cohort.capacity) reject('capacity', '정원이 모두 찼어요. 다음 기수를 확인해 주세요.');

      return repo.save(repo.create({ cohortId, userId: user.id, status: 'applied' }));
    });
    return this.findMine(user, saved.id);
  }

  // 내 신청만 보여 준다 (다른 사람 신청은 조회 대상이 아님)
  async listMine(user: User) {
    const rows = await this.db.getRepository(Application).find({
      where: { userId: user.id },
      relations: { cohort: { course: true } },
      order: { createdAt: 'DESC' },
    });
    return rows.map(toResponse);
  }

  private async findMine(user: User, id: number) {
    const row = await this.db.getRepository(Application).findOne({ where: { id, userId: user.id }, relations: { cohort: { course: true } } });
    if (!row) throw new NotFoundException({ message: '찾는 신청이 없어요.' });
    return toResponse(row);
  }

  // 신청 취소(R4): 본인 신청만, 개강 전까지만
  async cancel(user: User, id: number) {
    const repo = this.db.getRepository(Application);
    const row = await repo.findOne({ where: { id }, relations: { cohort: true } });
    if (!row) throw new NotFoundException({ message: '찾는 신청이 없어요.' });
    if (row.userId !== user.id) throw new ForbiddenException({ message: '내 신청만 취소할 수 있어요.' });
    if (row.status === 'cancelled') reject('cancelled', '이미 취소한 신청이에요.');
    if (row.cohort.startDate <= todayKST()) reject('started', '개강한 뒤에는 취소할 수 없어요. 운영팀에 문의해 주세요.');
    await repo.update(id, { status: 'cancelled', cancelledAt: new Date() });
    return this.findMine(user, id);
  }
}

function toResponse(a: Application) {
  const { cohort } = a;
  return {
    id: a.id,
    status: a.status,
    createdAt: a.createdAt,
    cancelledAt: a.cancelledAt,
    cohort: {
      id: cohort.id,
      cohortNo: cohort.cohortNo,
      startDate: cohort.startDate,
      endDate: cohort.endDate,
      schedule: cohort.schedule,
      applyDeadline: cohort.applyDeadline,
    },
    course: { id: cohort.course.id, title: cohort.course.title, category: cohort.course.category, format: cohort.course.format, price: cohort.course.price },
  };
}

@Controller()
export class ApplicationsController {
  constructor(
    private readonly applications: ApplicationsService,
    private readonly auth: AuthService,
  ) {}

  @Post('applications')
  async apply(@Headers('authorization') authorization: string | undefined, @Body() body: unknown) {
    const user = await this.auth.require(authorization, 'member');
    return this.applications.apply(user, body);
  }

  @Get('me/applications')
  async mine(@Headers('authorization') authorization: string | undefined) {
    const user = await this.auth.require(authorization, 'member');
    return this.applications.listMine(user);
  }

  @Post('applications/:id/cancel')
  async cancel(@Headers('authorization') authorization: string | undefined, @Param('id') id: string) {
    const user = await this.auth.require(authorization, 'member');
    return this.applications.cancel(user, parseId(id, '찾는 신청이 없어요.'));
  }
}
