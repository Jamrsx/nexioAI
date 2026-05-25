import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthSession, AuthUser } from '../types/auth';

const KEYS = {
  accessToken: '@nexio/access_token',
  refreshToken: '@nexio/refresh_token',
  expiresAt: '@nexio/expires_at',
  user: '@nexio/user',
} as const;

export const saveSession = async (session: AuthSession): Promise<void> => {
  if (!session.user?.email || !session.access_token || !session.refresh_token) {
    throw new Error(
      'Could not save login session locally (missing token data from server).',
    );
  }

  console.log('[NexioAI] Saving auth session for', session.user.email);

  await Promise.all([
    AsyncStorage.setItem(KEYS.accessToken, session.access_token),
    AsyncStorage.setItem(KEYS.refreshToken, session.refresh_token),
    AsyncStorage.setItem(KEYS.expiresAt, String(session.expires_at)),
    AsyncStorage.setItem(KEYS.user, JSON.stringify(session.user)),
  ]);
};

export const loadSession = async (): Promise<AuthSession | null> => {
  const [access_token, refresh_token, expires_at, userJson] = await Promise.all([
    AsyncStorage.getItem(KEYS.accessToken),
    AsyncStorage.getItem(KEYS.refreshToken),
    AsyncStorage.getItem(KEYS.expiresAt),
    AsyncStorage.getItem(KEYS.user),
  ]);

  if (!access_token || !refresh_token || !expires_at || !userJson) {
    return null;
  }

  try {
    const user = JSON.parse(userJson) as AuthUser;

    return {
      access_token,
      refresh_token,
      token_type: 'Bearer',
      expires_in: 0,
      expires_at: Number(expires_at),
      user,
    };
  } catch {
    return null;
  }
};

export const clearSession = async (): Promise<void> => {
  console.log('[NexioAI] Clearing auth session');
  await Promise.all([
    AsyncStorage.removeItem(KEYS.accessToken),
    AsyncStorage.removeItem(KEYS.refreshToken),
    AsyncStorage.removeItem(KEYS.expiresAt),
    AsyncStorage.removeItem(KEYS.user),
  ]);
};

export const getAccessToken = async (): Promise<string | null> => {
  return AsyncStorage.getItem(KEYS.accessToken);
};
