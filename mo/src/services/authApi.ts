import { getApiBaseUrl, getApiUrl } from '../config/api';
import type { AuthSession, AuthTokens, AuthUser } from '../types/auth';

type ApiErrorBody = {
  message?: string;
  errors?: Record<string, string[]>;
};

export class AuthApiError extends Error {
  status: number;

  fieldErrors?: Record<string, string[]>;

  constructor(message: string, status: number, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/** RN can break `instanceof`; use this for catch blocks. */
export const isAuthApiError = (err: unknown): err is AuthApiError =>
  err instanceof AuthApiError ||
  (typeof err === 'object' &&
    err !== null &&
    (err as AuthApiError).name === 'AuthApiError' &&
    typeof (err as AuthApiError).status === 'number');

const parseJsonBody = async (response: Response): Promise<Record<string, unknown>> => {
  try {
    return ((await response.json()) as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }
};

const firstValidationMessage = (
  errors: Record<string, string[]> | undefined,
): string | undefined => {
  if (!errors) {
    return undefined;
  }

  for (const messages of Object.values(errors)) {
    if (Array.isArray(messages) && messages.length > 0) {
      return messages[0];
    }
  }

  return undefined;
};

const parseError = (
  response: Response,
  body: Record<string, unknown>,
): AuthApiError => {
  const errors = body.errors as Record<string, string[]> | undefined;
  const message = body.message as string | undefined;

  const firstFieldError = firstValidationMessage(errors);

  return new AuthApiError(
    firstFieldError ?? message ?? `Request failed (${response.status})`,
    response.status,
    errors,
  );
};

const apiFetch = async (url: string, init: RequestInit): Promise<Response> => {
  try {
    console.log('[NexioAI] fetch', url);
    return await fetch(url, init);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[NexioAI] fetch failed:', url, detail);
    throw new AuthApiError(
      `Network error: ${detail}. The server may have responded, but the phone did not receive the full reply. Rebuild the app, then try Sign in if the account already exists.`,
      0,
    );
  }
};

const readTokenField = (
  data: Record<string, unknown>,
  snake: string,
  camel: string,
): string | undefined => {
  const value = data[snake] ?? data[camel];
  return typeof value === 'string' ? value : undefined;
};

const readExpiresIn = (data: Record<string, unknown>): number | undefined => {
  const value = data.expires_in ?? data.expiresIn;
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value !== '') {
    return Number(value);
  }
  return undefined;
};

const assertAuthPayload = (
  data: Record<string, unknown>,
  status: number,
): { user: AuthUser } & AuthTokens => {
  const user = data.user as AuthUser | undefined;
  const access_token = readTokenField(data, 'access_token', 'accessToken');
  const refresh_token = readTokenField(data, 'refresh_token', 'refreshToken');
  const token_type =
    readTokenField(data, 'token_type', 'tokenType') ?? 'Bearer';
  const expires_in = readExpiresIn(data);

  if (!user?.email || !access_token || !refresh_token || expires_in == null) {
    throw new AuthApiError(
      'Server saved your account but did not return login tokens. Try signing in with the same email and password.',
      status,
    );
  }

  return {
    user,
    access_token,
    refresh_token,
    token_type,
    expires_in,
  };
};

const buildSession = (
  user: AuthUser,
  tokens: AuthTokens,
): AuthSession => {
  const expires_at = Date.now() + tokens.expires_in * 1000;

  return {
    user,
    ...tokens,
    expires_at,
  };
};

export const pingHealth = async (): Promise<boolean> => {
  try {
    const response = await apiFetch(getApiUrl('/health'), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    console.log('[NexioAI] health status:', response.status);
    return response.ok;
  } catch (err) {
    console.error('[NexioAI] health check failed:', err);
    return false;
  }
};

export const register = async (payload: {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}): Promise<AuthSession> => {
  console.log('[NexioAI] API register:', getApiBaseUrl());

  const response = await apiFetch(getApiUrl('/register'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await parseJsonBody(response);

  if (!response.ok) {
    throw parseError(response, body);
  }

  const data = assertAuthPayload(body, response.status);

  return buildSession(data.user, {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_type: data.token_type,
    expires_in: data.expires_in,
  });
};

export const login = async (payload: {
  email: string;
  password: string;
}): Promise<AuthSession> => {
  console.log('[NexioAI] API login:', getApiBaseUrl());

  const response = await apiFetch(getApiUrl('/login'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await parseJsonBody(response);

  if (!response.ok) {
    throw parseError(response, body);
  }

  const data = assertAuthPayload(body, response.status);

  return buildSession(data.user, {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_type: data.token_type,
    expires_in: data.expires_in,
  });
};

export const refresh = async (refreshToken: string): Promise<AuthSession | null> => {
  const response = await fetch(getApiUrl('/auth/refresh'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    return null;
  }

  const tokens = (await response.json()) as AuthTokens;

  return {
    user: { id: 0, name: '', email: '' },
    ...tokens,
    expires_at: Date.now() + tokens.expires_in * 1000,
  };
};

export const fetchCurrentUser = async (accessToken: string): Promise<AuthUser | null> => {
  const response = await fetch(getApiUrl('/user'), {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { user: AuthUser };

  return data.user;
};

export const logout = async (accessToken: string): Promise<void> => {
  const response = await fetch(getApiUrl('/logout'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    console.log('[NexioAI] Logout API status:', response.status);
  }
};
