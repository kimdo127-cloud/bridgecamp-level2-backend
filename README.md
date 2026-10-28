# 브릿지캠프 수강 신청 · 백엔드 (Level 2)

가상 IT·AI 교육 회사 **브릿지캠프**의 과정·기수·수강 신청·계정·상담 챗봇 데이터를 다루는 API 서버입니다.

> AX Campus 1기 · 빌더트랙 1차 과제 **Level 2** 제출. Level 3 기능(로그인·역할·GPT 챗봇)을 추가 기능으로 함께 구현했습니다. 모든 정보는 가상 데이터입니다.

> ⏳ **무료 서버라 첫 접속이 느릴 수 있어요.** Render 무료 서버는 15분 동안 요청이 없으면 잠들고, 다음 첫 요청에 깨어나는 데 1분 가까이 걸립니다. 고장이 아닙니다.

- **배포 주소: https://bridgecamp-level2-backend.onrender.com** (연결 확인: [/health](https://bridgecamp-level2-backend.onrender.com/health))
- 프론트엔드 주소: https://bridgecamp-level2-frontend.vercel.app
- 기획서: [기획서.md](./기획서.md)
- 프론트엔드 저장소: [bridgecamp-level2-frontend](https://github.com/kimdo127-cloud/bridgecamp-level2-frontend)

## 확인용 계정

| 역할 | 아이디 | 비밀번호 |
| --- | --- | --- |
| 운영 매니저 (관리자) | `admin` | `admin1234` |
| 수강생 (일반) | `student` | `student1234` |

## 백엔드가 지키는 규칙

| 규칙 | 거절 (409) 안내 |
| --- | --- |
| 정원: 신청 중 인원이 정원에 닿으면 불가 | "정원이 모두 찼어요. 다음 기수를 확인해 주세요." |
| 중복 신청 금지: 같은 수강생 · 같은 기수 | "이미 신청한 기수예요. 내 신청에서 확인해 주세요." |
| 신청 기간: 신청 마감일(한국 시간)이 지나면 불가 | "신청 기간이 끝났어요. (마감 10월 27일 (화))" |
| 취소: 본인 신청만, 개강 전까지 | "개강한 뒤에는 취소할 수 없어요." |
| 권한: 신청은 수강생만, 운영 기능은 관리자만 | 401 "로그인이 필요해요." / 403 "운영 매니저만 할 수 있어요." |

신청은 기수 줄을 잠근 트랜잭션 안에서 확인·저장해서 동시에 신청이 몰려도 정원을 넘지 않습니다.

## API

| 기능 | 주소 | 권한 |
| --- | --- | --- |
| 연결 상태 | `GET /health` | 누구나 |
| 과정 목록 (검색·필터) | `GET /courses?q=&category=&format=` | 누구나 |
| 과정 상세 (남은 자리 포함) | `GET /courses/:id` | 누구나 |
| 상세 조회 기록 | `POST /courses/:id/views` | 누구나 |
| 과정 등록·수정, 기수 추가·수정 | `POST /courses`, `PATCH /courses/:id`, `POST /courses/:id/cohorts`, `PATCH /courses/:id/cohorts/:cohortId` | 관리자 |
| 로그인 / 내 정보 | `POST /auth/login`, `GET /auth/me` | 누구나 / 로그인 |
| 수강 신청 | `POST /applications` `{ "cohortId": 3 }` | 수강생 |
| 내 신청 / 신청 취소 | `GET /me/applications`, `POST /applications/:id/cancel` | 수강생(본인) |
| 운영 현황 | `GET /admin/stats` | 관리자 |
| 문의·챗봇 기록 | `GET /admin/inquiries` | 관리자 |
| 가상 데이터 다시 채우기 | `POST /admin/reset` | 관리자 |
| 상담 챗봇 | `POST /chat` `{ "message": "...", "history": [] }` | 누구나 |
| 운영팀 문의 | `POST /inquiries` | 수강생 |

로그인 후 받은 토큰은 `Authorization: Bearer <토큰>` 헤더로 보냅니다.

## 데이터 구조 (`level2` 스키마)

```
courses 1 ──< N cohorts 1 ──< N applications >── 1 users
courses 1 ──< N course_views        users 1 ──< N inquiries, chat_logs
```

- `cohorts`에 `apply_deadline`(신청 마감일)이 추가되었습니다.
- `applications`: 기수·계정·상태(applied·cancelled)·신청/취소 시각
- `course_views`: 상세 조회 기록 (신청 전환 현황)
- `inquiries`, `chat_logs`: 운영팀 문의와 챗봇 질문 기록

## 상담 챗봇 (GPT API)

`POST /chat`이 질문을 받을 때마다 DB의 최신 과정·기수 정보(개강일, 신청 마감일, 수강료, 남은 자리)를 함께 GPT에 보내고, 그 정보 안에서만 답하게 합니다. 정보에 없는 질문은 `needsHuman: true`로 돌려주어 화면이 운영팀 문의로 연결합니다. GPT 키는 이 서버의 설정값에만 있고 프론트엔드에는 없습니다.

## 설정값

| 이름 | 뜻 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 주소. 로컬은 Render DB의 **External** 주소, Render 서버는 **Internal** 주소 |
| `DB_SCHEMA` | 이 과제가 쓰는 DB 안의 공간 이름 (`level2`). Level 1(`level1`)과 섞이지 않음 |
| `FRONTEND_ORIGIN` | 요청을 허락할 프론트엔드 주소. 여러 개면 쉼표로 구분 |
| `GPT_API_KEY` | 챗봇용 OpenAI API 키 |
| `GPT_MODEL` | (선택) 챗봇 모델. 기본 `gpt-4.1-mini` |
| `JWT_SECRET` | 로그인 토큰 서명용 비밀값 (아무 긴 무작위 문자열) |
| `PORT` | 서버 포트. Render는 자동으로 정해 줌 (로컬 기본 4200) |

`.env`는 GitHub에 올리지 않습니다. `.env.example`을 복사해서 쓰세요.

## 로컬에서 실행

```bash
npm install
cp .env.example .env   # 값 채우기
npm run seed           # 가상 데이터 넣기 (과정 6, 기수 10, 계정 13, 신청 38)
npm run build && npm run start:prod   # http://localhost:4200/health
```

가상 데이터의 날짜는 넣는 날을 기준으로 계산되므로, 언제 다시 채워도 모집 중·마감 임박·진행 중·종료 기수가 고르게 보입니다.

## 배포 (Render)
- Region: DB와 같은 곳 (Virginia)
- Build Command: `npm install && npm run build`
- Start Command: `npm run start:prod`
- Environment: `DATABASE_URL`(Internal 주소), `DB_SCHEMA=level2`, `FRONTEND_ORIGIN`(Vercel 주소), `GPT_API_KEY`, `JWT_SECRET`
