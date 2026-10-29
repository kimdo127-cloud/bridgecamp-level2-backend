import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique, UpdateDateColumn, type Relation } from 'typeorm';

// 엔티티들이 서로를 참조하므로 ESM 순환 import를 피하려고 한 파일에 둔다.

// courses: 과정 (무엇을 배우는지)
@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 40 })
  title: string;

  @Column({ length: 10 })
  category: string;

  @Column({ length: 10 })
  level: string;

  @Column({ length: 10 })
  format: string;

  @Column({ length: 60 })
  summary: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'integer' })
  price: number;

  @Column({ name: 'default_capacity', type: 'integer' })
  defaultCapacity: number;

  @Column({ name: 'instructor_name', length: 20 })
  instructorName: string;

  @Column({ name: 'instructor_bio', length: 60, default: '' })
  instructorBio: string;

  @Column({ name: 'recommended_for', type: 'text' })
  recommendedFor: string;

  @Column({ type: 'text' })
  curriculum: string;

  @Column({ type: 'text', default: '' })
  preparation: string;

  // 대표 사진. 화면에서 줄인 이미지를 data URL(base64)로 저장한다. 없으면 분야 그림을 보여 준다
  @Column({ type: 'text', nullable: true })
  thumbnail: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Cohort, (cohort) => cohort.course)
  cohorts: Relation<Cohort[]>;
}

// cohorts: 기수 (언제 여는지). courses 1 : N cohorts
@Entity('cohorts')
@Unique('uq_cohorts_course_no', ['courseId', 'cohortNo'])
export class Cohort {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'course_id', type: 'integer' })
  courseId: number;

  @ManyToOne(() => Course, (course) => course.cohorts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Relation<Course>;

  @Column({ name: 'cohort_no', type: 'integer' })
  cohortNo: number;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ type: 'integer' })
  capacity: number;

  @Column({ length: 40, default: '' })
  schedule: string;

  // 신청 마감일. 이 날(한국 시간)까지 신청할 수 있다
  @Column({ name: 'apply_deadline', type: 'date' })
  applyDeadline: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => Application, (a) => a.cohort)
  applications: Relation<Application[]>;
}

export type Role = 'admin' | 'member';

// users: 계정. 회원가입 없이 가상 데이터로 미리 만든 계정을 쓴다
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'login_id', length: 40, unique: true })
  loginId: string;

  @Column({ length: 20 })
  name: string;

  @Column({ length: 20, default: '' })
  phone: string;

  @Column({ length: 10 })
  role: Role;

  @Column({ name: 'password_hash', length: 200 })
  passwordHash: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

export type ApplicationStatus = 'applied' | 'cancelled';

// applications: 수강 신청. cohorts 1 : N applications, users 1 : N applications
@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cohort_id', type: 'integer' })
  cohortId: number;

  @ManyToOne(() => Cohort, (c) => c.applications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cohort_id' })
  cohort: Relation<Cohort>;

  @Column({ name: 'user_id', type: 'integer' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({ length: 10, default: 'applied' })
  status: ApplicationStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;
}

// course_views: 상세 화면 조회 기록. 신청 전환 현황(조회 → 신청) 계산에 쓴다
@Entity('course_views')
export class CourseView {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'course_id', type: 'integer' })
  courseId: number;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Relation<Course>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

// inquiries: 수강생이 운영팀에 남긴 문의 (챗봇이 답하지 못한 질문에서 이어지기도 한다)
@Entity('inquiries')
export class Inquiry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'integer' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({ name: 'course_id', type: 'integer', nullable: true })
  courseId: number | null;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'chat_question', type: 'text', default: '' })
  chatQuestion: string;

  @Column({ length: 10, default: 'open' })
  status: 'open' | 'done';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

// chat_logs: 챗봇 질문과 답변 기록. 관리자가 사람별(로그인 계정 / 브라우저 방문자 ID)로 묶어 본다.
// 질문은 개인정보 형태를 가린 뒤 저장하고, 로그인하지 않은 방문자 기록은 30일 뒤 지운다
@Entity('chat_logs')
export class ChatLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'integer', nullable: true })
  userId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User> | null;

  // 로그인하지 않은 방문자를 구분하는 브라우저 무작위 ID (UUID). 신원 정보는 담기지 않는다
  @Column({ name: 'visitor_id', type: 'varchar', length: 36, nullable: true })
  visitorId: string | null;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'text' })
  answer: string;

  @Column({ name: 'needs_human', type: 'boolean', default: false })
  needsHuman: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

// admin_replies: 운영 매니저의 답변. 로그인 수강생에게는 계정으로(내 신청·챗봇에서 확인),
// 비로그인 방문자에게는 브라우저 방문자 ID로(같은 브라우저로 챗봇을 열면 확인) 전달한다
@Entity('admin_replies')
export class AdminReply {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'integer', nullable: true })
  userId: number | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User> | null;

  @Column({ name: 'visitor_id', type: 'varchar', length: 36, nullable: true })
  visitorId: string | null;

  @Column({ name: 'admin_id', type: 'integer', nullable: true })
  adminId: number | null;

  @Column({ type: 'text' })
  message: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
