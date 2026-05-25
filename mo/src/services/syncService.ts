import {
  ensureDeviceId,
  getPendingConversations,
  getPendingCounts,
  getPendingMessages,
  markConversationsSynced,
  markMessagesSynced,
} from '../db/syncRepository';
import { getAccessToken } from './authStorage';
import { pushSyncBatch } from './syncApi';
import type { SyncRunResult } from '../types/sync';

const APP_VERSION = '0.0.1';

export const syncPending = async (): Promise<SyncRunResult> => {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return {
      ok: false,
      syncedConversations: 0,
      syncedMessages: 0,
      skippedReason: 'not_authenticated',
    };
  }

  const pending = await getPendingCounts();
  if (pending.conversations === 0 && pending.messages === 0) {
    console.log('[NexioAI] syncPending: nothing to sync');
    return {
      ok: true,
      syncedConversations: 0,
      syncedMessages: 0,
      skippedReason: 'nothing_pending',
    };
  }

  const conversations = await getPendingConversations();
  const messages = await getPendingMessages();
  const deviceId = await ensureDeviceId();

  const payload = {
    conversations,
    messages: messages.map(message => ({
      ...message,
      device_id: deviceId,
      app_version: APP_VERSION,
    })),
  };

  try {
    const result = await pushSyncBatch(payload, accessToken);

    const conversationUuids = conversations.map(item => item.client_uuid);
    const messageUuids = messages.map(item => item.client_uuid);

    await markConversationsSynced(conversationUuids);
    await markMessagesSynced(messageUuids);

    console.log('[NexioAI] syncPending success:', result.synced_at);

    return {
      ok: true,
      syncedConversations: conversationUuids.length,
      syncedMessages: messageUuids.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    console.error('[NexioAI] syncPending error:', message);

    return {
      ok: false,
      syncedConversations: 0,
      syncedMessages: 0,
      error: message,
    };
  }
};

export { getPendingCounts };
