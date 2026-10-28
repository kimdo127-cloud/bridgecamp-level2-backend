import { Body, Controller, Get, Headers, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { AuthService } from './auth.js';
import { CoursesService } from './courses.service.js';

export function parseId(id: string, message = '찾는 과정이 없어요.') {
  const n = Number(id);
  if (!Number.isInteger(n) || n < 1) throw new NotFoundException({ message });
  return n;
}

// 보기(목록·상세)는 누구나, 등록·수정은 운영 매니저만 할 수 있다
@Controller('courses')
export class CoursesController {
  constructor(
    private readonly courses: CoursesService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  list(@Query('q') q?: string, @Query('category') category?: string, @Query('format') format?: string) {
    return this.courses.list({ q, category, format });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.courses.get(parseId(id));
  }

  @Post(':id/views')
  view(@Param('id') id: string) {
    return this.courses.recordView(parseId(id));
  }

  @Post()
  async create(@Headers('authorization') authorization: string | undefined, @Body() body: unknown) {
    await this.auth.require(authorization, 'admin');
    return this.courses.create(body);
  }

  @Patch(':id')
  async update(@Headers('authorization') authorization: string | undefined, @Param('id') id: string, @Body() body: unknown) {
    await this.auth.require(authorization, 'admin');
    return this.courses.update(parseId(id), body);
  }

  @Patch(':id/cohorts/:cohortId')
  async updateCohort(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
    @Param('cohortId') cohortId: string,
    @Body() body: unknown,
  ) {
    await this.auth.require(authorization, 'admin');
    return this.courses.updateCohort(parseId(id), parseId(cohortId, '찾는 기수가 없어요.'), body);
  }

  @Post(':id/cohorts')
  async addCohort(@Headers('authorization') authorization: string | undefined, @Param('id') id: string, @Body() body: unknown) {
    await this.auth.require(authorization, 'admin');
    return this.courses.addCohort(parseId(id), body);
  }
}
