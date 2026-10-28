import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { Body, Controller, ForbiddenException, Get, Headers, Injectable, Post, UnauthorizedException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User, type Role } from './entities.js';

// 비밀번호는 원문 대신 scrypt 해시로 저장한다 ("salt:hash")
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 32).toString('hex')}`;
}

function checkPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// 로그인 토큰: "내용.서명" 형태. 서명은 JWT_SECRET으로 만들어 위조를 막는다 (7일 유효)
const TOKEN_DAYS = 7;

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET이 없어요. backend/.env에 넣어 주세요.');
  return s;
}

function sign(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function issueToken(user: User) {
  const payload = Buffer.from(JSON.stringify({ uid: user.id, exp: Date.now() + TOKEN_DAYS * 86_400_000 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function readToken(authorization?: string): number | null {
  const token = authorization?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof uid === 'number' && exp > Date.now() ? uid : null;
  } catch {
    return null;
  }
}

export function publicUser(u: User) {
  return { id: u.id, loginId: u.loginId, name: u.name, role: u.role };
}

// 매 요청마다 토큰으로 계정을 찾고 역할을 확인한다. 화면에서 숨기는 것과 별개로 백엔드가 최종 확인한다
@Injectable()
export class AuthService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  // 로그인하지 않았으면 null (챗봇처럼 누구나 쓸 수 있는 기능에서 사용)
  async optional(authorization?: string) {
    const uid = readToken(authorization);
    return uid ? this.db.getRepository(User).findOneBy({ id: uid }) : null;
  }

  async require(authorization: string | undefined, role?: Role) {
    const user = await this.optional(authorization);
    if (!user) throw new UnauthorizedException({ message: '로그인이 필요해요. 다시 로그인해 주세요.' });
    if (role === 'admin' && user.role !== 'admin') throw new ForbiddenException({ message: '운영 매니저만 할 수 있어요.' });
    if (role === 'member' && user.role !== 'member') throw new ForbiddenException({ message: '수강생 계정으로 로그인해 주세요.' });
    return user;
  }

  async login(body: unknown) {
    const b = (body ?? {}) as Record<string, unknown>;
    const loginId = typeof b.loginId === 'string' ? b.loginId.trim().toLowerCase() : '';
    const password = typeof b.password === 'string' ? b.password : '';
    const errors: Record<string, string> = {};
    if (!loginId) errors.loginId = '아이디를 입력해 주세요.';
    if (!password) errors.password = '비밀번호를 입력해 주세요.';
    if (Object.keys(errors).length > 0) throw new UnauthorizedException({ message: '아이디와 비밀번호를 입력해 주세요.', errors });

    const user = await this.db.getRepository(User).findOneBy({ loginId });
    if (!user || !checkPassword(password, user.passwordHash)) {
      throw new UnauthorizedException({ message: '아이디 또는 비밀번호가 맞지 않아요.', errors: {} });
    }
    return { token: issueToken(user), user: publicUser(user) };
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() body: unknown) {
    return this.auth.login(body);
  }

  @Get('me')
  async me(@Headers('authorization') authorization?: string) {
    return publicUser(await this.auth.require(authorization));
  }
}
