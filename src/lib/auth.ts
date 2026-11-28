import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
  type CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { CLIENT_ID, USER_POOL_ID, useCognito } from './config';
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

/** 登录成功但需要先完成 NEW_PASSWORD_REQUIRED 挑战。 */
export class PasswordChangeRequiredError extends Error {
  constructor() {
    super('首次登录需要设置新密码');
    this.name = 'PasswordChangeRequiredError';
  }
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

const pool = useCognito
  ? new CognitoUserPool({ UserPoolId: USER_POOL_ID, ClientId: CLIENT_ID })
  : null;

let pendingUser: CognitoUser | null = null;
let currentUser: CognitoUser | null = null;

function encodeDemoToken(user: SessionUser) {
  const payload = {
    sub: user.user_uuid,
    'cognito:username': user.username,
    'cognito:groups': [user.role],
    exp: Math.floor(Date.now() / 1000) + 20 * 60 * 60,
  };
  return btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string; name?: string } | null)?.code
    ?? (err as { name?: string } | null)?.name
    ?? '';
  switch (code) {
    case 'NotAuthorizedException':
    case 'UserNotFoundException':
      return '用户名或密码错误';
    case 'UserNotConfirmedException':
      return '账号尚未完成验证，请联系管理员';
    case 'PasswordResetRequiredException':
      return '需要先重置密码，请联系管理员';
    case 'TooManyRequestsException':
      return '尝试过于频繁，请稍后再试';
    case 'InvalidPasswordException':
      return '密码不符合要求';
    default:
      return (err as { message?: string } | null)?.message ?? '登录失败，请稍后重试';
  }
}

function sessionFromCognito(user: CognitoUser): AuthSession {
  const cognitoSession: CognitoUserSession | null = user.getSignInUserSession();
  if (!cognitoSession) throw new Error('登录会话无效，请重新登录');
  const accessToken = cognitoSession.getAccessToken();
  const idToken = cognitoSession.getIdToken();
  const payload = idToken.decodePayload() as Record<string, unknown>;
  const groups = Array.isArray(payload['cognito:groups']) ? (payload['cognito:groups'] as string[]) : [];
  const session: AuthSession = {
    accessToken: accessToken.getJwtToken(),
    idToken: idToken.getJwtToken(),
    expiresAt: accessToken.getExpiration() * 1000,
    user: {
      user_uuid: String(payload.sub ?? ''),
      username: String(payload['cognito:username'] ?? user.getUsername()),
      role: groups.includes('admin') ? 'admin' : 'user',
    },
    mustChangePassword: false,
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  currentUser = user;
  return session;
}

export async function signIn(username: string, password: string): Promise<AuthSession> {
  if (!pool) {
    await new Promise((resolve) => window.setTimeout(resolve, 260));
    const account = DEMO_ACCOUNTS[username.trim()];
    if (!account || account.password !== password) {
      throw new Error('用户名或密码错误');
    }
    const session: AuthSession = {
      accessToken: encodeDemoToken(account.user),
      idToken: encodeDemoToken(account.user),
      expiresAt: Date.now() + 20 * 60 * 60 * 1000,
      user: account.user,
      mustChangePassword: account.mustChangePassword === true,
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(session));
    return session;
  }

  const cognitoUser = new CognitoUser({ Username: username.trim(), Pool: pool });
  const details = new AuthenticationDetails({ Username: username.trim(), Password: password });

  return new Promise<AuthSession>((resolve, reject) => {
    cognitoUser.authenticateUser(details, {
      onSuccess: () => {
        try {
          resolve(sessionFromCognito(cognitoUser));
        } catch (err) {
          reject(err);
        }
      },
      onFailure: (err) => reject(new Error(authErrorMessage(err))),
      newPasswordRequired: () => {
        pendingUser = cognitoUser;
        reject(new PasswordChangeRequiredError());
      },
    });
  });
}

export function hasPendingPasswordChallenge(): boolean {
  return pendingUser !== null;
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

export function getAccessToken(): string | null {
  return getSession()?.accessToken ?? null;
}

export function signOut() {
  try {
    currentUser?.signOut();
  } catch {
    // Cognito 侧失败不影响本地清理
  }
  currentUser = null;
  pendingUser = null;
  localStorage.removeItem(AUTH_KEY);
}

/** 业务接口 401：清会话并回登录页，保留回跳地址。 */
export function onUnauthorized() {
  signOut();
  const here = `${window.location.pathname}${window.location.search}`;
  if (!here.startsWith('/login')) {
    window.location.assign(`/login?redirect=${encodeURIComponent(here)}`);
  }
}

export function roleFromSession(session: AuthSession | null): Role {
  return session?.user.role ?? 'user';
}

/** 8–20 位，含大写、小写、数字；不强制符号（03-需求文档「认证与账号」）。 */
export function validatePassword(password: string): string | null {
  if (password.length < 8 || password.length > 20) return '密码长度需为 8–20 位';
  if (!/[A-Z]/.test(password)) return '密码需包含大写字母';
  if (!/[a-z]/.test(password)) return '密码需包含小写字母';
  if (!/[0-9]/.test(password)) return '密码需包含数字';
  return null;
}

/** 完成首登/重置后的强制改密：真实环境走 Cognito 挑战，mock 环境更新本地会话。 */
export async function completePasswordChange(password: string): Promise<AuthSession> {
  const error = validatePassword(password);
  if (error) throw new Error(error);

  if (pendingUser) {
    const user = pendingUser;
    await new Promise<void>((resolve, reject) => {
      user.completeNewPasswordChallenge(
        password,
        {},
        {
          onSuccess: () => resolve(),
          onFailure: (err) => reject(new Error(authErrorMessage(err))),
        },
      );
    });
    pendingUser = null;
    return sessionFromCognito(user);
  }

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

export const DEMO_LOGIN_HINT = useCognito
  ? ''
  : 'zhang.wei / demo；newbie / demo 可演示首登改密';
