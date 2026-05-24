import { API_BASE_URL as LOCAL_BASE, API_PREFIX } from './api.local';
import { API_BASE_URL as PROD_BASE } from './api.production';

export type ApiEnvironment = 'local' | 'production';

/** Toggle for testing: local Laragon vs deployed backend */
export const API_ENV: ApiEnvironment = 'local';

const baseUrl = API_ENV === 'local' ? LOCAL_BASE : PROD_BASE;

export const getApiBaseUrl = (): string => baseUrl;

export const getApiUrl = (path: string): string => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${API_PREFIX}${normalized}`;
};

console.log('[NexioAI] API base:', getApiBaseUrl(), 'env:', API_ENV);
