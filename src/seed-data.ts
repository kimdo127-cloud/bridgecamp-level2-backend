
// 가상 데이터 (npm run seed). id는 DB가 새로 붙이고, courseId는 아래 목록의 순서(1부터)를 뜻한다.
export const SEED_COURSES = [
  {
    id: 1,
    title: "ChatGPT 업무 자동화 입문",
    category: "AI 활용",
    level: "입문",
    format: "온라인",
    summary: "반복 업무를 프롬프트와 자동화 도구로 줄이는 4주",
    description:
      "보고서 초안, 회의록 정리, 메일 답장처럼 매일 반복하는 업무를 AI로 줄이는 방법을 배워요.\n\n매주 실습 과제가 있고, 마지막 주에는 내 업무 하나를 골라 자동화 흐름을 직접 만들어 발표합니다.",
    price: 190000,
    defaultCapacity: 40,
    instructorName: "이서준",
    instructorBio: "대기업 사내 AI 도입 프로젝트 리드 · 업무 자동화 강의 5년",
    recommendedFor: "매일 비슷한 문서를 반복해서 만드는 직장인\nChatGPT를 써 봤지만 업무에 제대로 못 쓰고 있는 분\n코딩 없이 업무를 자동화하고 싶은 분",
    curriculum: "프롬프트 기본기: 원하는 결과를 얻는 질문법\n문서 업무 자동화: 보고서·회의록·메일\n도구 연결: 스프레드시트와 자동화 도구\n내 업무 자동화 프로젝트와 발표",
    preparation: "노트북과 ChatGPT 무료 계정만 있으면 돼요. 코딩 경험은 필요 없어요.",
    createdAt: "2026-06-01T10:00:00+09:00",
  },
  {
    id: 2,
    title: "SQL로 시작하는 데이터 분석",
    category: "데이터",
    level: "초급",
    format: "온라인",
    summary: "실제 서비스 데이터로 지표를 뽑고 대시보드까지",
    description:
      "가상의 쇼핑몰 데이터를 가지고 SELECT부터 JOIN, 그룹 집계까지 배워요.\n\n후반부에는 리텐션·전환율 같은 서비스 지표를 직접 계산하고, 결과를 대시보드로 정리하는 미니 프로젝트를 합니다.",
    price: 350000,
    defaultCapacity: 30,
    instructorName: "정민아",
    instructorBio: "커머스 스타트업 데이터 분석가 · 지표 설계와 대시보드 구축",
    recommendedFor: "데이터 팀에 매번 숫자를 요청하는 기획자·마케터\n엑셀은 익숙하지만 SQL은 처음인 분\n데이터 분석 직무로 이직을 준비하는 분",
    curriculum: "SQL 기초: SELECT, WHERE, ORDER BY\n집계와 그룹: GROUP BY, 집계 함수\n테이블 연결: JOIN 완전 정복\n서비스 지표 계산: 리텐션, 전환율\n대시보드 만들기\n미니 프로젝트 발표",
    preparation: "엑셀을 써 본 적이 있으면 충분해요. 실습 환경은 브라우저에서 바로 열려요.",
    createdAt: "2026-06-15T10:00:00+09:00",
  },
  {
    id: 3,
    title: "프론트엔드 부트캠프 (React)",
    category: "개발",
    level: "초급",
    format: "하이브리드",
    summary: "12주 동안 웹 서비스 3개를 만들어 배포까지",
    description:
      "HTML·CSS·JavaScript 기초부터 React, API 연동, 배포까지 12주 동안 집중해서 배워요.\n\n주 1회 오프라인 코드 리뷰가 있고, 수료 때는 팀 프로젝트 결과물로 데모데이를 엽니다.",
    price: 0,
    defaultCapacity: 25,
    instructorName: "박지훈",
    instructorBio: "핀테크 프론트엔드 리드 · 부트캠프 멘토 4년",
    recommendedFor: "개발자로 커리어를 바꾸고 싶은 분\n혼자 공부하다 막혀서 끝까지 완주해 본 적이 없는 분\n포트폴리오로 쓸 결과물이 필요한 분",
    curriculum: "웹 기초: HTML·CSS\nJavaScript 핵심 문법 (2주)\nReact 기초와 컴포넌트\n상태 관리와 API 연동 (2주)\n개인 프로젝트 1\n배포와 성능 개선\n팀 프로젝트 (3주)\n데모데이",
    preparation: "주 20시간 이상 학습할 수 있는 분께 추천해요. 개인 노트북이 필요해요.",
    createdAt: "2026-07-01T10:00:00+09:00",
  },
  {
    id: 4,
    title: "AI 서비스 기획 실무",
    category: "기획·PM",
    level: "중급",
    format: "오프라인",
    summary: "AI 기능이 들어간 서비스를 기획하고 검증하는 법",
    description:
      "AI가 잘하는 일과 못하는 일을 구분하는 것부터, 기능 정의, 프롬프트 설계, 실패했을 때의 처리까지 기획자의 관점에서 다뤄요.\n\n매주 실제 서비스 사례를 분석하고, 마지막 주에는 기획서를 발표하고 피드백을 받아요.",
    price: 290000,
    defaultCapacity: 20,
    instructorName: "최유진",
    instructorBio: "AI 스타트업 시니어 PM · 생성형 AI 서비스 3개 출시",
    recommendedFor: "AI 기능 기획을 맡게 된 서비스 기획자·PM\n개발자와 AI 기능을 이야기할 때 막히는 분\nAI 서비스 포트폴리오가 필요한 분",
    curriculum: "AI가 잘하는 일, 못하는 일\nAI 기능 정의와 사용자 흐름\n프롬프트 설계와 실패 처리\n기획서 발표와 피드백",
    preparation: "서비스 기획·PM 실무 1년 이상인 분께 추천해요. 강남 강의장에서 진행해요.",
    createdAt: "2026-07-20T10:00:00+09:00",
  },
  {
    id: 5,
    title: "노코드로 MVP 만들기",
    category: "기획·PM",
    level: "입문",
    format: "온라인",
    summary: "개발 없이 3주 만에 내 아이디어를 서비스로",
    description:
      "노코드 도구와 AI를 조합해 랜딩 페이지, 신청 폼, 자동 알림까지 갖춘 MVP를 만들어요.\n\n수료할 때는 실제로 링크를 공유할 수 있는 결과물이 남아요.",
    price: 150000,
    defaultCapacity: 40,
    instructorName: "한예린",
    instructorBio: "1인 창업가 · 노코드 서비스 10개 이상 출시",
    recommendedFor: "아이디어는 있는데 개발자가 없는 분\n빠르게 시장 반응을 확인하고 싶은 예비 창업자\n사이드 프로젝트를 시작하고 싶은 직장인",
    curriculum: "아이디어 정리와 랜딩 페이지\n신청 폼과 데이터 관리\n자동 알림과 공개 링크 배포",
    preparation: "만들고 싶은 아이디어를 하나 생각해 와 주세요.",
    createdAt: "2026-08-10T10:00:00+09:00",
  },
  {
    id: 6,
    title: "UX/UI 디자인 기초",
    category: "디자인",
    level: "입문",
    format: "온라인",
    summary: "피그마로 앱 화면 한 벌을 완성하는 6주",
    description: "사용자 인터뷰, 화면 흐름 설계, 와이어프레임, 피그마 디자인까지 한 과정을 경험해요.",
    price: 250000,
    defaultCapacity: 30,
    instructorName: "윤서아",
    instructorBio: "핀테크 앱 프로덕트 디자이너",
    recommendedFor: "디자인 직무로 전환을 고민하는 분\n기획서를 화면으로 직접 그려 보고 싶은 기획자",
    curriculum: "사용자 인터뷰\n화면 흐름 설계\n와이어프레임\n피그마 기초\n디자인 시스템\n최종 화면 발표",
    preparation: "피그마 무료 계정을 미리 만들어 와 주세요.",
    createdAt: "2026-05-10T10:00:00+09:00",
  },
];

// 기수 날짜는 "가상 데이터를 넣는 날" 기준 며칠 뒤(음수는 며칠 전)로 적어서, 언제 다시 채워도 모집 중·진행 중·종료가 고르게 보이게 한다.
// deadline을 비우면 개강 전날이 신청 마감일이 된다.
export const SEED_COHORTS: {
  courseId: number;
  cohortNo: number;
  start: number;
  end: number;
  deadline?: number;
  capacity: number;
  schedule: string;
}[] = [
  { courseId: 1, cohortNo: 5, start: -57, end: -32, capacity: 40, schedule: "화·목 19:30~21:30" },
  { courseId: 1, cohortNo: 6, start: 6, end: 31, deadline: 4, capacity: 40, schedule: "화·목 19:30~21:30" },
  { courseId: 1, cohortNo: 7, start: 34, end: 59, capacity: 40, schedule: "토 10:00~13:00" },
  { courseId: 2, cohortNo: 3, start: -15, end: 24, capacity: 30, schedule: "월·수 20:00~22:00" },
  { courseId: 2, cohortNo: 4, start: 27, end: 66, capacity: 30, schedule: "월·수 20:00~22:00" },
  { courseId: 3, cohortNo: 2, start: 13, end: 94, capacity: 25, schedule: "평일 10:00~17:00" },
  // 얼리 마감: 개강 전이지만 신청 마감일이 이미 지났다 (신청 기간 규칙 확인용)
  { courseId: 4, cohortNo: 1, start: 10, end: 31, deadline: -1, capacity: 20, schedule: "토 14:00~17:00" },
  // 정원이 적어 이미 다 찬 기수 (정원 규칙 확인용)
  { courseId: 4, cohortNo: 2, start: 38, end: 59, capacity: 8, schedule: "토 14:00~17:00" },
  { courseId: 5, cohortNo: 4, start: 3, end: 20, capacity: 40, schedule: "수 20:00~22:00" },
  { courseId: 6, cohortNo: 3, start: -85, end: -46, capacity: 30, schedule: "화 20:00~22:00" },
];

// 확인용 계정 (README에 적어 둠). 그 밖의 수강생은 신청 현황을 채우기 위한 가상 계정으로, 로그인 정보는 공개하지 않는다
export const SEED_USERS = [
  { key: "admin", loginId: "admin", password: "admin1234", name: "박지은", phone: "010-0000-0001", role: "admin" as const },
  { key: "student", loginId: "student", password: "student1234", name: "김수강", phone: "010-1234-5678", role: "member" as const },
  { key: "student2", loginId: "student2", password: "student1234", name: "이배움", phone: "010-2345-6789", role: "member" as const },
  ...["최하늘", "정다은", "강민준", "윤서연", "임도현", "한지우", "오유나", "서준호", "신예린", "조현우"].map((name, i) => ({
    key: `m${i + 1}`,
    loginId: `member${String(i + 1).padStart(2, "0")}`,
    password: null,
    name,
    phone: `010-9000-${String(i + 1).padStart(4, "0")}`,
    role: "member" as const,
  })),
];

// 가상 신청. cohort는 SEED_COHORTS의 순서(0부터), daysAgo는 며칠 전에 신청했는지 (0이면 오늘)
export const SEED_APPLICATIONS: { cohort: number; user: string; daysAgo: number; cancelled?: boolean }[] = [
  // ChatGPT 업무 자동화 입문 6기: 확인용 수강생이 신청해 둔 상태
  { cohort: 1, user: "student", daysAgo: 2 },
  ...["m1", "m2", "m3", "m4", "m5"].map((user, i) => ({ cohort: 1, user, daysAgo: i })),
  { cohort: 1, user: "m6", daysAgo: 0 },
  // SQL 3기(진행 중)
  ...["m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8", "m9", "m10"].map((user, i) => ({ cohort: 3, user, daysAgo: 20 + i })),
  // SQL 4기: 확인용 수강생이 신청했다가 취소한 기록
  { cohort: 4, user: "student", daysAgo: 5, cancelled: true },
  { cohort: 4, user: "m7", daysAgo: 1 },
  { cohort: 4, user: "m8", daysAgo: 0 },
  // 프론트엔드 부트캠프 2기
  ...["m2", "m3", "m4"].map((user, i) => ({ cohort: 5, user, daysAgo: i + 1 })),
  { cohort: 5, user: "m9", daysAgo: 0 },
  // AI 서비스 기획 1기(얼리 마감)
  ...["m5", "m6", "m7"].map((user, i) => ({ cohort: 6, user, daysAgo: 3 + i })),
  // AI 서비스 기획 2기: 정원 8명이 모두 찬 상태
  ...["m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8"].map((user, i) => ({ cohort: 7, user, daysAgo: i })),
  // 노코드 MVP 4기(마감 임박)
  ...["m9", "m10", "student2"].map((user, i) => ({ cohort: 8, user, daysAgo: i })),
];

// 과정별 상세 조회 수 (신청 전환 현황용). 순서는 SEED_COURSES와 같다
export const SEED_VIEWS = [128, 74, 61, 52, 47, 18];

export const SEED_INQUIRIES = [
  { user: "student", course: 3, message: "부트캠프 중간에 회사 일정 때문에 1주 빠지면 수료가 어려운가요?", chatQuestion: "부트캠프 결석하면 수료 못 하나요?", daysAgo: 1 },
  { user: "student2", course: 1, message: "회사에서 교육비 지원을 받으려고 하는데 세금계산서 발행이 되나요?", chatQuestion: "", daysAgo: 0 },
];

export const SEED_CHATS = [
  { user: "student", question: "이번 달에 개강하는 온라인 과정 있어요?", answer: "네, 노코드로 MVP 만들기 4기와 ChatGPT 업무 자동화 입문 6기가 곧 개강해요.", needsHuman: false, daysAgo: 2 },
  { user: null, question: "SQL 처음인데 들어도 되나요?", answer: "SQL로 시작하는 데이터 분석은 초급 과정이라 엑셀을 써 본 적이 있으면 충분해요.", needsHuman: false, daysAgo: 1 },
  { user: "student", question: "부트캠프 결석하면 수료 못 하나요?", answer: "출결 기준은 과정 정보에 없어서 운영팀 확인이 필요해요.", needsHuman: true, daysAgo: 1 },
  { user: null, question: "환불 규정이 어떻게 되나요?", answer: "환불 규정은 과정 정보에 없어서 운영팀에 문의를 남겨 주세요.", needsHuman: true, daysAgo: 0 },
];
