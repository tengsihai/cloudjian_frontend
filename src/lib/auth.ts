import type { Role, SessionUser } from './types';

const AUTH_KEY = ['cloudjian', 'auth', 'v1'].join('.');

export interface AuthSession {
  accessToken: string;
  idToken: string;
  expiresAt: number;
  user: SessionUser;
  /** Cognito NEW_PASSWORD_REQUIRED 挑战待完成 */
  mustChangePassword?: boolean;
}

interface DemoAccount {
  password: string;
  user: SessionUser;
  mustChangePassword?: boolean;
}

const DEMO_ACCOUNTS: Record<string, DemoAccount> = {
  'zhang.wei': {
    password: 'demo',
    user: { user_uuid: 'u-me', username: 'zhang.wei', role: 'admin' },
  },
  'li.na': {
    password: 'demo',
    user: { user_uuid: 'u-li', username: 'li.na', role: 'user' },
  },
  'wang.bo': {
    password: 'demo',
    user: { user_uuid: 'u-wang', username: 'wang.bo', role: 'user' },
  },
  newbie: {
    password: 'demo',
    user: { user_uuid: 'u-newbie', username: 'newbie', role: 'user' },
    mustChangePassword: true,
  },
};

function encodeToken(user: SessionUser) {
  const payload = {
    sub: user.user_uuid,
    'cognito:username': user.username,
    'cognito:groups': [user.role],
    exp: Math.floor(Date.now() / 1000) + 20 * 60 * 60,
  };
  return btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function signIn(username: string, password: string): Promise<AuthSession> {
  await new Promise((resolve) => window.setTimeout(resolve, 260));
  const account = DEMO_ACCOUNTS[username.trim()];
  if (!account || account.password !== password) {
    throw new Error('用户名或密码错误');
  }
  const session: AuthSession = {
    accessToken: encodeToken(account.user),
    idToken: encodeToken(account.user),
    expiresAt: Date.now() + 20 * 60 * 60 * 1000,
    user: account.user,
    mustChangePassword: account.mustChangePassword === true,
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  return session;
}

export function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (!session.accessToken || session.expiresAt <= Date.now()) {
      localStorage.removeItem(AUTH_KEY);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(AUTH_KEY);
    return null;
  }
}

export function signOut() {
  localStorage.removeItem(AUTH_KEY);
}

/** 8–20 位，含大写、小写、数字；不强制符号（03-需求文档「认证与账号」）。 */
export function validatePassword(password: string): string | null {
  if (password.length < 8 || password.length > 20) return '密码长度需为 8–20 位';
  if (!/[A-Z]/.test(password)) return '密码需包含大写字母';
  if (!/[a-z]/.test(password)) return '密码需包含小写字母';
  if (!/[0-9]/.test(password)) return '密码需包含数字';
  return null;
}

/**
 * 完成首登/重置后的强制改密。
 * 真实环境走 Cognito `NEW_PASSWORD_REQUIRED` 挑战（前端直连 Cognito）；
 * 当前 mock 阶段在本地清除标记并刷新会话。
 */
export function completePasswordChange(password: string): AuthSession {
  const error = validatePassword(password);
  if (error) throw new Error(error);
  const session = getSession();
  if (!session) throw new Error('会话已失效，请重新登录');
  const next: AuthSession = {
    ...session,
    mustChangePassword: false,
    user: { ...session.user, must_change_password: false },
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(next));
  return next;
}

export function roleFromSession(session: AuthSession | null): Role {
  return session?.user.role ?? 'user';
}

export const DEMO_LOGIN_HINT = 'zhang.wei / demo；newbie / demo 可演示首登改密';
