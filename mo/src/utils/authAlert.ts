import { getApiBaseUrl } from '../config/api';
import { isAuthApiError } from '../services/authApi';

const isNetworkFailure = (message: string): boolean => {
  const lower = message.toLowerCase();

  return (
    lower.includes('network request failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('timeout') ||
    lower.includes('ecconnrefused') ||
    lower.includes('unable to resolve host')
  );
};

export const getAuthFailureAlert = (
  err: unknown,
  action: 'login' | 'register',
): { title: string; message: string } => {
  const fallback =
    action === 'register'
      ? 'Registration could not be completed.'
      : 'Sign in could not be completed.';

  const message = err instanceof Error ? err.message : fallback;

  if (isAuthApiError(err)) {
    const title =
      err.status === 0
        ? 'Connection error'
        : action === 'register'
          ? 'Registration failed'
          : 'Login failed';

    return { title, message };
  }

  if (isNetworkFailure(message)) {
    return {
      title: 'Connection error',
      message: `Cannot reach the API at ${getApiBaseUrl()}.\n\nCheck Laragon is running (php artisan serve --host=0.0.0.0 --port=8000) and that api.local.ts uses your PC's Wi‑Fi IP.`,
    };
  }

  return {
    title: action === 'register' ? 'Registration failed' : 'Sign in failed',
    message,
  };
};
