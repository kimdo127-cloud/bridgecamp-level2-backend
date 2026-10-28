import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Brackets, DataSource } from 'typeorm';
import { Application, Cohort, Course, CourseView } from './entities.js';
import { CATEGORIES, FORMATS, todayKST, validateCohort, validateCourse, type FieldErrors } from './validation.js';

function rejectIfInvalid(errors: FieldErrors) {
  if (Object.keys(errors).length > 0) {
    throw new BadRequestException({ message: '입력한 내용을 다시 확인해 주세요.', errors });
  }
}

export interface CourseFilter {
  q?: string;
  category?: string;
  format?: string;
}

// 기수마다 "신청 중" 인원을 붙여서 남은 자리를 화면이 바로 보여 줄 수 있게 한다
function toResponse(course: Course, applied: Map<number, number>) {
  const { cohorts, ...rest } = course;
  return {
    ...rest,
    cohorts: [...(cohorts ?? [])]
      .sort((a, b) => a.cohortNo - b.cohortNo)
      .map(({ course: _course, applications: _apps, ...c }) => {
        const appliedCount = applied.get(c.id) ?? 0;
        return { ...c, appliedCount, remaining: Math.max(c.capacity - appliedCount, 0) };
      }),
  };
}

@Injectable()
export class CoursesService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  // 기수별 신청 중 인원 (취소된 신청은 세지 않는다)
  async appliedCounts(cohortIds?: number[]) {
    const qb = this.db
      .getRepository(Application)
      .createQueryBuilder('a')
      .select('a.cohortId', 'cohortId')
      .addSelect('COUNT(*)::int', 'count')
      .where("a.status = 'applied'")
      .groupBy('a.cohortId');
    if (cohortIds) qb.andWhere('a.cohortId IN (:...ids)', { ids: cohortIds.length ? cohortIds : [0] });
    const rows: { cohortId: number; count: number }[] = await qb.getRawMany();
    return new Map(rows.map((r) => [Number(r.cohortId), Number(r.count)]));
  }

  // 검색어는 과정 이름·한 줄 소개·강사에서 찾고, 분야와 수업 방식은 정해진 보기만 받는다
  async list(filter: CourseFilter = {}) {
    const qb = this.db.getRepository(Course).createQueryBuilder('c').leftJoinAndSelect('c.cohorts', 'h').orderBy('c.id', 'ASC');
    const q = filter.q?.trim().slice(0, 40);
    if (q) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('c.title ILIKE :q', { q: `%${q}%` })
            .orWhere('c.summary ILIKE :q', { q: `%${q}%` })
            .orWhere('c.instructor_name ILIKE :q', { q: `%${q}%` });
        }),
      );
    }
    if (filter.category && CATEGORIES.includes(filter.category)) qb.andWhere('c.category = :category', { category: filter.category });
    if (filter.format && FORMATS.includes(filter.format)) qb.andWhere('c.format = :format', { format: filter.format });
    const courses = await qb.getMany();
    const applied = await this.appliedCounts();
    return courses.map((c) => toResponse(c, applied));
  }

  async get(id: number) {
    const course = await this.db.getRepository(Course).findOne({ where: { id }, relations: { cohorts: true } });
    if (!course) throw new NotFoundException({ message: '찾는 과정이 없어요.' });
    const applied = await this.appliedCounts(course.cohorts.map((c) => c.id));
    return toResponse(course, applied);
  }

  // 상세 화면 조회 기록 (신청 전환 현황 계산용)
  async recordView(id: number) {
    await this.get(id);
    await this.db.getRepository(CourseView).insert({ courseId: id });
    return { ok: true };
  }

  async create(body: unknown) {
    const { errors, value } = validateCourse(body);
    rejectIfInvalid(errors);

    const { cohorts, ...courseValues } = value;
    // 과정과 첫 기수들은 함께 저장되거나 함께 실패한다
    const id = await this.db.transaction(async (tx) => {
      const course = await tx.getRepository(Course).save(tx.getRepository(Course).create(courseValues));
      await tx.getRepository(Cohort).save(cohorts.map((c, i) => tx.getRepository(Cohort).create({ ...c, courseId: course.id, cohortNo: i + 1 })));
      return course.id;
    });
    return this.get(id);
  }

  // 과정 정보 수정 (대표 사진 포함). 기수는 따로 수정한다
  async update(id: number, body: unknown) {
    await this.get(id);
    const { errors, value } = validateCourse(body, { withCohorts: false });
    rejectIfInvalid(errors);
    const { cohorts: _cohorts, ...courseValues } = value;
    await this.db.getRepository(Course).update(id, courseValues);
    return this.get(id);
  }

  // 기수 수정. 이미 시작했거나 끝난 기수는 수강생이 있을 수 있어 고치지 않는다
  async updateCohort(courseId: number, cohortId: number, body: unknown) {
    const repo = this.db.getRepository(Cohort);
    const cohort = await repo.findOneBy({ id: cohortId, courseId });
    if (!cohort) throw new NotFoundException({ message: '찾는 기수가 없어요.' });
    if (cohort.startDate <= todayKST()) {
      throw new BadRequestException({ message: '이미 시작한 기수는 수정할 수 없어요.', errors: {} });
    }
    const { errors, value } = validateCohort(body);
    // 이미 신청한 사람보다 정원을 작게 줄일 수는 없다
    const applied = (await this.appliedCounts([cohortId])).get(cohortId) ?? 0;
    if (!errors.capacity && value.capacity < applied) errors.capacity = `이미 ${applied}명이 신청했어요. 정원은 ${applied}명 이상이어야 해요.`;
    rejectIfInvalid(errors);
    await repo.update(cohortId, value);
    return (await this.get(courseId)).cohorts.find((c) => c.id === cohortId);
  }

  // 기수 번호는 그 과정의 마지막 기수 + 1로 자동으로 붙는다
  async addCohort(courseId: number, body: unknown) {
    await this.get(courseId);
    const { errors, value } = validateCohort(body);
    rejectIfInvalid(errors);

    const repo = this.db.getRepository(Cohort);
    const last = await repo.maximum('cohortNo', { courseId });
    const cohort = await repo.save(repo.create({ ...value, courseId, cohortNo: (last ?? 0) + 1 }));
    return (await this.get(courseId)).cohorts.find((c) => c.id === cohort.id);
  }
}
