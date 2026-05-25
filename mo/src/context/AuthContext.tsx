import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as authApi from '../services/authApi';
import * as authStorage from '../services/authStorage';
import type { AuthSession, AuthUser } from '../types/auth';

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    passwordConfirmation: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applySession = useCallback(async (session: AuthSession) => {
    await authStorage.saveSession(session);
    setUser(session.user);
  }, []);

  const restoreSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const stored = await authStorage.loadSession();
      if (!stored) {
        setUser(null);
        return;
      }

      let accessToken = stored.access_token;

      const canRefresh =
        stored.refresh_token &&
        stored.refresh_token !== stored.access_token;

      if (canRefresh && Date.now() >= stored.expires_at - 60_000) {
        console.log('[NexioAI] Access token expiring, refreshing…');
        const refreshed = await authApi.refresh(stored.refresh_token);
        if (refreshed) {
          const merged: AuthSession = {
            ...refreshed,
            user: stored.user,
          };
          await authStorage.saveSession(merged);
          accessToken = merged.access_token;
        }
      }

      const currentUser = await authApi.fetchCurrentUser(accessToken);
      if (currentUser) {
        const session: AuthSession = {
          ...stored,
          access_token: accessToken,
          user: currentUser,
        };
        await authStorage.saveSession(session);
        setUser(currentUser);
        console.log('[NexioAI] Session restored for', currentUser.email);
      } else {
        await authStorage.clearSession();
        setUser(null);
      }
    } catch (err) {
      console.error('[NexioAI] restoreSession error:', err);
      await authStorage.clearSession();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await authApi.login({ email, password });
      await applySession(session);
      console.log('[NexioAI] Login success');
    },
    [applySession],
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      passwordConfirmation: string,
    ) => {
      const session = await authApi.register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      await applySession(session);
      console.log('[NexioAI] Register success');
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    const token = await authStorage.getAccessToken();
    if (token) {
      await authApi.logout(token);
    }
    await authStorage.clearSession();
    setUser(null);
    console.log('[NexioAI] Logged out');
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return ctx;
}
