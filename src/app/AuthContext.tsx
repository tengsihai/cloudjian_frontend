import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import * as authLib from '../lib/auth';
import type { AuthSession } from '../lib/auth';

interface AuthContextValue {
  session: AuthSession | null;
  signIn: (username: string, password: string) => Promise<AuthSession>;
  signOut: () => void;
  changePassword: (password: string) => Promise<AuthSession>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => authLib.getSession());

  const signIn = useCallback(async (username: string, password: string) => {
    const next = await authLib.signIn(username, password);
    setSession(next);
    return next;
  }, []);

  const signOut = useCallback(() => {
    authLib.signOut();
    setSession(null);
  }, []);

  const changePassword = useCallback(async (password: string) => {
    const next = await authLib.completePasswordChange(password);
    setSession(next);
    return next;
  }, []);

  const value = useMemo(
    () => ({ session, signIn, signOut, changePassword }),
    [session, signIn, signOut, changePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

export function RequireAuth() {
  const { session } = useAuth();
  const location = useLocation();
  if (!session) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }
  // 首登/重置后未改密：除改密页外一律拦回，不能跳过
  if (session.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }
  return <Outlet />;
}

export function RequireAdmin() {
  const { session } = useAuth();
  if (session?.user.role !== 'admin') {
    return <Navigate to="/403" replace />;
  }
  return <Outlet />;
}
