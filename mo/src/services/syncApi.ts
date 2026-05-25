import { getApiUrl } from '../config/api';
import type { SyncBatchPayload, SyncBatchResponse } from '../types/sync';

export class SyncApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'SyncApiError';
    this.status = status;
  }
}

export const pushSyncBatch = async (
  payload: SyncBatchPayload,
  accessToken: string,
): Promise<SyncBatchResponse> => {
  const url = getApiUrl('/sync/batch');
  console.log('[NexioAI] sync batch:', {
    conversations: payload.conversations.length,
    messages: payload.messages.length,
  });

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new SyncApiError(`Network error during sync: ${detail}`, 0);
  }

  let body: Record<string, unknown> = {};
  try {
    body = ((await response.json()) as Record<string, unknown>) ?? {};
  } catch {
    body = {};
  }

  if (!response.ok) {
    const message =
      (body.message as string | undefined) ??
      `Sync failed (${response.status})`;
    throw new SyncApiError(message, response.status);
  }

  return body as SyncBatchResponse;
};
