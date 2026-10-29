// 챗봇에 입력된 문장에서 형식이 정해진 개인정보를 가린다. 저장하기 전과 GPT로 보내기 전에 모두 적용하고, 원본은 남기지 않는다.
// 이름처럼 형식이 없는 정보는 가리지 못하므로 채팅창에서 "개인정보는 입력하지 마세요"라고 함께 안내한다.

const RULES: { pattern: RegExp; replace: string }[] = [
  // 주민등록번호: 900101-1234567 (뒷자리 첫 숫자 1~8)
  { pattern: /\b\d{6}\s?-\s?[1-8]\d{6}\b/g, replace: '******-*******' },
  // 카드번호: 13~19자리 숫자 (4자리씩 띄어 쓰거나 하이픈으로 끊은 형태 포함)
  { pattern: /\b(?:\d[ -]?){12,18}\d\b/g, replace: '****-****-****-****' },
  // 휴대폰·전화번호: 010-1234-5678, 01012345678, 02-123-4567, +82 10-1234-5678
  { pattern: /(?:\+82[ -]?)?\b0?1[016789][ -.]?\d{3,4}[ -.]?\d{4}\b/g, replace: '***-****-****' },
  { pattern: /\b0\d{1,2}[ -.]\d{3,4}[ -.]\d{4}\b/g, replace: '***-****-****' },
  // 이메일
  { pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, replace: '***@***' },
];

export function maskPersonalInfo(text: string) {
  return RULES.reduce((t, r) => t.replace(r.pattern, r.replace), text);
}

// 브라우저가 만든 방문자 ID(UUID)만 받는다. 형식이 다르면 저장하지 않는다
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseVisitorId(v: unknown) {
  return typeof v === 'string' && UUID.test(v) ? v.toLowerCase() : null;
}

// 로그인하지 않은 방문자의 챗봇 기록 보관 기간
export const GUEST_CHAT_RETENTION_DAYS = 30;
