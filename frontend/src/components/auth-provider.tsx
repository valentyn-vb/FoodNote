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

// api-client pulls in the @foodnote/shared zod schemas (~67KB gz) for
// response validation. This provider sits in the root layout, so a *static*
// import would force zod into every route's shared bundle — including the
// homepage. Importing it lazily inside each operation keeps zod out of the
// eager bundle: the session restore below runs on mount everywhere (the
// homepage now shows a Dashboard link when authenticated, so it needs the
// status too), but it goes through this dynamic import, so zod loads async
// off the critical path rather than blocking first render. The module is
// cached after first load, so repeat calls don't re-fetch.
const apiClient = () => import('@/lib/api-client');

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
  // Runs once on mount on every route (including the homepage, which shows a
  // Dashboard link when authenticated); the api-client import is lazy, so this
  // stays off the initial render's critical path.
  useEffect(() => {
    let cancelled = false;
    apiClient()
      .then(({ auth }) => auth.me())
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
    const { auth } = await apiClient();
    const res = await auth.register(data);
    setUser(res.user);
    setStatus('authenticated');
  }, []);

  const login = useCallback(async (data: LoginRequest) => {
    const { auth } = await apiClient();
    const res = await auth.login(data);
    setUser(res.user);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    const { auth, setAccessToken } = await apiClient();
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
