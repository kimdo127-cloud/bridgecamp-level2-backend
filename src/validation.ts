// 기획서 "규칙"의 입력 규칙. 프론트엔드(src/lib/validation.ts)와 같은 규칙·같은 문구를 쓴다.
// 프론트엔드에서 막더라도 백엔드가 최종으로 다시 검사한다.

export type FieldErrors = Record<string, string>;

export const CATEGORIES = ['AI 활용', '데이터', '개발', '디자인', '기획·PM'];
export const LEVELS = ['입문', '초급', '중급'];
export const FORMATS = ['온라인', '오프라인', '하이브리드'];

const DIGITS = /^\d+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CAPACITY = 60;
const MAX_WEEKS = 26;

export interface CohortValues {
  startDate: string;
  endDate: string;
  capacity: number;
  schedule: string;
  applyDeadline: string;
}

// 대표 사진: 화면에서 줄인 JPG·PNG·WEBP data URL만 받는다 (약 1MB 이하)
const THUMBNAIL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_THUMBNAIL_LENGTH = 1_400_000;

export function validateThumbnail(v: unknown): { error: string | null; value: string | null } {
  if (v === null || v === undefined || v === '') return { error: null, value: null };
  if (typeof v !== 'string' || !THUMBNAIL.test(v)) return { error: '사진은 JPG, PNG, WEBP 파일만 올릴 수 있어요.', value: null };
  if (v.length > MAX_THUMBNAIL_LENGTH) return { error: '사진 용량이 너무 커요. 더 작은 사진을 골라 주세요.', value: null };
  return { error: null, value: v };
}

export interface CourseValues {
  title: string;
  category: string;
  level: string;
  format: string;
  summary: string;
  description: string;
  price: number;
  defaultCapacity: number;
  instructorName: string;
  instructorBio: string;
  recommendedFor: string;
  curriculum: string;
  preparation: string;
  thumbnail: string | null;
  cohorts: CohortValues[];
}

// 서버는 해외에 있을 수 있으므로 "오늘"은 한국 시간 기준으로 계산한다
export function todayKST() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');
const lines = (v: string) => v.split('\n').map((l) => l.trim()).filter(Boolean);

function isRealDate(value: string) {
  if (!DATE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

// "YYYY-MM-DD"에서 하루 전 날짜
export function dayBefore(date: string) {
  return new Date(Date.parse(date) - 86_400_000).toISOString().slice(0, 10);
}

function checkLength(value: string, min: number, max: number, empty: string, range: string) {
  if (!value) return empty;
  if (value.length < min || value.length > max) return range;
  return null;
}

function checkCapacity(value: string) {
  if (!value) return '정원을 입력해 주세요.';
  if (!DIGITS.test(value)) return '정원은 숫자로만 입력해 주세요. (예: 30)';
  if (Number(value) < 1 || Number(value) > MAX_CAPACITY) return `정원은 1명부터 ${MAX_CAPACITY}명까지 정할 수 있어요.`;
  return null;
}

export function validateCohort(body: unknown): { errors: FieldErrors; value: CohortValues } {
  const b = (body ?? {}) as Record<string, unknown>;
  const startDate = str(b.startDate);
  const endDate = str(b.endDate);
  const capacity = str(b.capacity);
  const schedule = str(b.schedule);
  const rawDeadline = str(b.applyDeadline);
  const errors: FieldErrors = {};

  if (!startDate) errors.startDate = '개강일을 골라 주세요.';
  else if (!isRealDate(startDate)) errors.startDate = '날짜 형식이 올바르지 않아요. 달력에서 날짜를 골라 주세요.';
  else if (startDate <= todayKST()) errors.startDate = '개강일은 내일 이후 날짜로 골라 주세요.';

  if (!endDate) errors.endDate = '종강일을 골라 주세요.';
  else if (!isRealDate(endDate)) errors.endDate = '날짜 형식이 올바르지 않아요. 달력에서 날짜를 골라 주세요.';
  else if (isRealDate(startDate) && endDate < startDate) errors.endDate = '종강일은 개강일보다 뒤여야 해요.';
  else if (isRealDate(startDate) && daysBetween(startDate, endDate) > MAX_WEEKS * 7)
    errors.endDate = `한 기수는 최대 ${MAX_WEEKS}주까지 열 수 있어요.`;

  const cap = checkCapacity(capacity);
  if (cap) errors.capacity = cap;
  if (schedule.length > 40) errors.schedule = '수업 시간 안내는 40자 이내로 적어 주세요.';

  // 신청 마감일은 비워 두면 개강 전날로 정한다. 적었다면 오늘부터 개강일 사이여야 한다
  let applyDeadline = rawDeadline;
  if (!rawDeadline) {
    applyDeadline = isRealDate(startDate) ? dayBefore(startDate) : '';
  } else if (!isRealDate(rawDeadline)) errors.applyDeadline = '날짜 형식이 올바르지 않아요. 달력에서 날짜를 골라 주세요.';
  else if (rawDeadline < todayKST()) errors.applyDeadline = '신청 마감일은 오늘 이후 날짜로 골라 주세요.';
  else if (isRealDate(startDate) && rawDeadline > startDate) errors.applyDeadline = '신청 마감일은 개강일과 같거나 그 전이어야 해요.';

  return { errors, value: { startDate, endDate, capacity: Number(capacity), schedule, applyDeadline } };
}

// 과정 등록은 첫 기수가 함께 필요하고, 과정 수정은 기수 없이 과정 정보만 검사한다
export function validateCourse(body: unknown, { withCohorts = true } = {}): { errors: FieldErrors; value: CourseValues } {
  const b = (body ?? {}) as Record<string, unknown>;
  const v = {
    title: str(b.title),
    category: str(b.category),
    level: str(b.level),
    format: str(b.format),
    summary: str(b.summary),
    description: str(b.description),
    price: str(b.price).replaceAll(',', ''),
    defaultCapacity: str(b.defaultCapacity),
    instructorName: str(b.instructorName),
    instructorBio: str(b.instructorBio),
    recommendedFor: str(b.recommendedFor),
    curriculum: str(b.curriculum),
    preparation: str(b.preparation),
  };
  const errors: FieldErrors = {};
  const set = (key: string, message: string | null) => {
    if (message) errors[key] = message;
  };

  set('title', checkLength(v.title, 2, 40, '과정 이름을 입력해 주세요.', '과정 이름은 2~40자로 입력해 주세요.'));
  if (!CATEGORIES.includes(v.category)) errors.category = '분야를 골라 주세요.';
  if (!LEVELS.includes(v.level)) errors.level = '난이도를 골라 주세요.';
  if (!FORMATS.includes(v.format)) errors.format = '수업 방식을 골라 주세요.';
  set('summary', checkLength(v.summary, 5, 60, '한 줄 소개를 입력해 주세요.', '한 줄 소개를 5~60자로 입력해 주세요.'));

  if (!v.price) errors.price = '수강료를 입력해 주세요. 무료라면 0을 입력해 주세요.';
  else if (!DIGITS.test(v.price)) errors.price = '수강료는 숫자로만 입력해 주세요. (예: 190000)';
  else if (Number(v.price) > 5_000_000) errors.price = '수강료는 500만 원 이하로 입력해 주세요.';

  set('defaultCapacity', checkCapacity(v.defaultCapacity));
  set('instructorName', checkLength(v.instructorName, 1, 20, '강사 이름을 입력해 주세요.', '강사 이름은 20자 이내로 입력해 주세요.'));
  if (v.instructorBio.length > 60) errors.instructorBio = '강사 소개는 60자 이내로 적어 주세요.';

  const recommended = lines(v.recommendedFor);
  if (recommended.length === 0) errors.recommendedFor = '추천 대상을 한 줄 이상 적어 주세요.';
  else if (recommended.length > 5) errors.recommendedFor = '추천 대상은 5줄까지 적을 수 있어요.';

  const steps = lines(v.curriculum);
  if (steps.length === 0) errors.curriculum = '커리큘럼을 한 줄 이상 적어 주세요.';
  else if (steps.length > 26) errors.curriculum = '커리큘럼은 26줄까지 적을 수 있어요.';

  if (v.preparation.length > 300) errors.preparation = '준비 사항은 300자 이내로 적어 주세요.';
  const thumbnail = validateThumbnail(b.thumbnail);
  if (thumbnail.error) errors.thumbnail = thumbnail.error;
  set('description', checkLength(v.description, 10, 1000, '과정 소개를 입력해 주세요.', '과정 소개를 10자 이상, 1000자 이내로 적어 주세요.'));

  const rawCohorts = withCohorts && Array.isArray(b.cohorts) ? b.cohorts : [];
  if (withCohorts && rawCohorts.length === 0) errors.cohorts = '기수를 하나 이상 추가해 주세요.';
  const cohorts = rawCohorts.map((c, i) => {
    const r = validateCohort(c);
    for (const [field, message] of Object.entries(r.errors)) errors[`cohorts.${i}.${field}`] = message;
    return r.value;
  });

  return {
    errors,
    value: {
      ...v,
      recommendedFor: recommended.join('\n'),
      curriculum: steps.join('\n'),
      price: Number(v.price),
      defaultCapacity: Number(v.defaultCapacity),
      thumbnail: thumbnail.value,
      cohorts,
    },
  };
}
