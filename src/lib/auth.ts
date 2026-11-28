import type { Role, SessionUser } from './types';

const AUTH_KEY = ['cloudjian', 'auth', 'v1'].join('.');

export interface AuthSession {
  accessToken: string;
  idToken: string;
  expiresAt: number;
  user: SessionUser;
}

interface DemoAccount {
  password: string;
  user: SessionUser;
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

export function roleFromSession(session: AuthSession | null): Role {
  return session?.user.role ?? 'user';
}

export const DEMO_LOGIN_HINT = 'zhang.wei / demo';
