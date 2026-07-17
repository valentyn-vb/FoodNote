'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { AuthUser, LoginRequest, RegisterRequest } from '@foodnote/shared';
import { auth, setAccessToken } from '@/lib/api-client';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  register: (data: RegisterRequest) => Promise<void>;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  // Session restore: the access token never survives a reload (memory only),
  // but auth.me() 401s, api-client silently exchanges the refresh cookie for
  // a new access token and retries — so this resolves the real session state.
  useEffect(() => {
    let cancelled = false;
    auth
      .me()
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setStatus('authenticated');
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        setStatus('unauthenticated');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    const res = await auth.register(data);
    setUser(res.user);
    setStatus('authenticated');
  }, []);

  const login = useCallback(async (data: LoginRequest) => {
    const res = await auth.login(data);
    setUser(res.user);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } finally {
      // Even if the request fails, drop the local session; the server-side
      // cookie (if still set) is useless without further requests.
      setAccessToken(null);
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  const value = useMemo(
    () => ({ user, status, register, login, logout }),
    [user, status, register, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
