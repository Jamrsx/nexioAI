import { getDatabase } from './database';
import type { SyncConversationPayload, SyncMessagePayload } from '../types/sync';
import { createUuid } from '../utils/uuid';

type SqlRow = Record<string, unknown>;

const nowIso = (): string => new Date().toISOString();

const rowString = (row: SqlRow, key: string): string => String(row[key] ?? '');

const rowNullableString = (row: SqlRow, key: string): string | null => {
  const value = row[key];
  if (value == null || value === '') {
    return null;
  }
  return String(value);
};

export type PendingCounts = {
  conversations: number;
  messages: number;
};

export const getPendingCounts = async (): Promise<PendingCounts> => {
  const db = getDatabase();

  const conversations = await db.execute(
    "SELECT COUNT(*) AS count FROM conversations WHERE sync_status = 'pending'",
  );
  const messages = await db.execute(
    "SELECT COUNT(*) AS count FROM messages WHERE sync_status = 'pending'",
  );

  const convRow = (conversations.rows[0] ?? {}) as SqlRow;
  const msgRow = (messages.rows[0] ?? {}) as SqlRow;

  return {
    conversations: Number(convRow.count ?? 0),
    messages: Number(msgRow.count ?? 0),
  };
};

export const getPendingConversations = async (): Promise<SyncConversationPayload[]> => {
  const db = getDatabase();
  const result = await db.execute(
    `SELECT client_uuid, title, model_name, updated_at
     FROM conversations
     WHERE sync_status = 'pending'`,
  );

  return (result.rows as SqlRow[]).map(row => ({
    client_uuid: rowString(row, 'client_uuid'),
    title: rowNullableString(row, 'title'),
    model_name: rowNullableString(row, 'model_name'),
    updated_at: rowString(row, 'updated_at'),
  }));
};

export const getPendingMessages = async (): Promise<SyncMessagePayload[]> => {
  const db = getDatabase();
  const result = await db.execute(
    `SELECT
       m.client_uuid,
       m.role,
       m.content,
       m.source,
       m.model_name,
       m.client_created_at,
       c.client_uuid AS conversation_client_uuid
     FROM messages m
     INNER JOIN conversations c ON c.id = m.conversation_id
     WHERE m.sync_status = 'pending'`,
  );

  return (result.rows as SqlRow[]).map(row => {
    const role = rowString(row, 'role');

    return {
      client_uuid: rowString(row, 'client_uuid'),
      conversation_client_uuid: rowString(row, 'conversation_client_uuid'),
      role: role as SyncMessagePayload['role'],
      content: rowString(row, 'content'),
      source: rowString(row, 'source') || 'local_llama',
      model_name: rowNullableString(row, 'model_name'),
      client_created_at: rowString(row, 'client_created_at'),
    };
  });
};

export const markConversationsSynced = async (
  clientUuids: string[],
): Promise<void> => {
  if (clientUuids.length === 0) {
    return;
  }

  const db = getDatabase();
  const placeholders = clientUuids.map(() => '?').join(', ');

  await db.execute(
    `UPDATE conversations SET sync_status = 'synced' WHERE client_uuid IN (${placeholders})`,
    clientUuids,
  );
};

export const markMessagesSynced = async (clientUuids: string[]): Promise<void> => {
  if (clientUuids.length === 0) {
    return;
  }

  const db = getDatabase();
  const placeholders = clientUuids.map(() => '?').join(', ');

  await db.execute(
    `UPDATE messages SET sync_status = 'synced' WHERE client_uuid IN (${placeholders})`,
    clientUuids,
  );
};

/** Dev helper — inserts a pending Q&A pair for sync testing (Chunk 5). */
export const seedPendingTestConversation = async (): Promise<{
  conversationUuid: string;
  userMessageUuid: string;
  assistantMessageUuid: string;
}> => {
  const db = getDatabase();
  const conversationUuid = createUuid();
  const userMessageUuid = createUuid();
  const assistantMessageUuid = createUuid();
  const timestamp = nowIso();

  await db.execute(
    `INSERT INTO conversations (client_uuid, title, model_name, sync_status, updated_at)
     VALUES (?, ?, ?, 'pending', ?)`,
    [conversationUuid, 'Test offline chat', 'tinyllama-q4', timestamp],
  );

  const conversationRow = await db.execute(
    'SELECT id FROM conversations WHERE client_uuid = ?',
    [conversationUuid],
  );
  const conversationId = Number(
    rowString((conversationRow.rows[0] ?? {}) as SqlRow, 'id'),
  );

  await db.execute(
    `INSERT INTO messages (
       client_uuid, conversation_id, role, content, source, model_name,
       sync_status, client_created_at
     ) VALUES (?, ?, 'user', ?, 'local_llama', NULL, 'pending', ?)`,
    [
      userMessageUuid,
      conversationId,
      'Hello from NexioAI offline test',
      timestamp,
    ],
  );

  await db.execute(
    `INSERT INTO messages (
       client_uuid, conversation_id, role, content, source, model_name,
       sync_status, client_created_at
     ) VALUES (?, ?, 'assistant', ?, 'local_llama', 'tinyllama-q4', 'pending', ?)`,
    [
      assistantMessageUuid,
      conversationId,
      'This message was saved locally and will sync when online.',
      new Date(Date.now() + 1000).toISOString(),
    ],
  );

  console.log('[NexioAI] Seeded pending test conversation:', conversationUuid);

  return { conversationUuid, userMessageUuid, assistantMessageUuid };
};

export const ensureDeviceId = async (): Promise<string> => {
  const db = getDatabase();
  const existing = await db.execute(
    "SELECT value FROM settings WHERE key = 'device_id'",
  );

  if (existing.rows.length > 0) {
    return rowString((existing.rows[0] ?? {}) as SqlRow, 'value');
  }

  const deviceId = createUuid();
  await db.execute("INSERT INTO settings (key, value) VALUES ('device_id', ?)", [
    deviceId,
  ]);

  return deviceId;
};
