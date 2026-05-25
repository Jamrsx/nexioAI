import { getDatabase } from './database';
import type { LocalConversation, LocalMessage } from '../types/chat';
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

const mapConversation = (row: SqlRow): LocalConversation => ({
  id: Number(row.id),
  client_uuid: rowString(row, 'client_uuid'),
  title: rowNullableString(row, 'title'),
  model_name: rowNullableString(row, 'model_name'),
  sync_status: rowString(row, 'sync_status') as LocalConversation['sync_status'],
  updated_at: rowString(row, 'updated_at'),
});

const mapMessage = (row: SqlRow): LocalMessage => ({
  id: Number(row.id),
  client_uuid: rowString(row, 'client_uuid'),
  conversation_id: Number(row.conversation_id),
  role: rowString(row, 'role') as LocalMessage['role'],
  content: rowString(row, 'content'),
  source: rowString(row, 'source'),
  model_name: rowNullableString(row, 'model_name'),
  sync_status: rowString(row, 'sync_status') as LocalMessage['sync_status'],
  client_created_at: rowString(row, 'client_created_at'),
});

export const listConversations = async (): Promise<LocalConversation[]> => {
  const db = getDatabase();
  const result = await db.execute(
    `SELECT id, client_uuid, title, model_name, sync_status, updated_at
     FROM conversations
     ORDER BY updated_at DESC`,
  );

  return (result.rows as SqlRow[]).map(mapConversation);
};

export const getConversationById = async (
  id: number,
): Promise<LocalConversation | null> => {
  const db = getDatabase();
  const result = await db.execute(
    `SELECT id, client_uuid, title, model_name, sync_status, updated_at
     FROM conversations WHERE id = ?`,
    [id],
  );

  const row = result.rows[0] as SqlRow | undefined;
  return row ? mapConversation(row) : null;
};

export const createConversation = async (
  title = 'New chat',
  modelName: string | null = null,
): Promise<LocalConversation> => {
  const db = getDatabase();
  const clientUuid = createUuid();
  const timestamp = nowIso();

  await db.execute(
    `INSERT INTO conversations (client_uuid, title, model_name, sync_status, updated_at)
     VALUES (?, ?, ?, 'pending', ?)`,
    [clientUuid, title, modelName, timestamp],
  );

  const result = await db.execute(
    'SELECT id FROM conversations WHERE client_uuid = ?',
    [clientUuid],
  );
  const id = Number(rowString((result.rows[0] ?? {}) as SqlRow, 'id'));

  console.log('[NexioAI] Created conversation:', id, clientUuid);

  return {
    id,
    client_uuid: clientUuid,
    title,
    model_name: modelName,
    sync_status: 'pending',
    updated_at: timestamp,
  };
};

export const touchConversation = async (conversationId: number): Promise<void> => {
  const db = getDatabase();
  const timestamp = nowIso();

  await db.execute(
    `UPDATE conversations
     SET updated_at = ?, sync_status = 'pending'
     WHERE id = ?`,
    [timestamp, conversationId],
  );
};

export const updateConversationTitle = async (
  conversationId: number,
  title: string,
): Promise<void> => {
  const db = getDatabase();

  await db.execute(
    `UPDATE conversations
     SET title = ?, updated_at = ?, sync_status = 'pending'
     WHERE id = ?`,
    [title.slice(0, 80), nowIso(), conversationId],
  );
};

export const listMessages = async (
  conversationId: number,
): Promise<LocalMessage[]> => {
  const db = getDatabase();
  const result = await db.execute(
    `SELECT id, client_uuid, conversation_id, role, content, source, model_name,
            sync_status, client_created_at
     FROM messages
     WHERE conversation_id = ?
     ORDER BY client_created_at ASC, id ASC`,
    [conversationId],
  );

  return (result.rows as SqlRow[]).map(mapMessage);
};

export const insertMessage = async (input: {
  conversationId: number;
  role: LocalMessage['role'];
  content: string;
  modelName?: string | null;
}): Promise<LocalMessage> => {
  const db = getDatabase();
  const clientUuid = createUuid();
  const timestamp = nowIso();

  await db.execute(
    `INSERT INTO messages (
       client_uuid, conversation_id, role, content, source, model_name,
       sync_status, client_created_at
     ) VALUES (?, ?, ?, ?, 'local_llama', ?, 'pending', ?)`,
    [
      clientUuid,
      input.conversationId,
      input.role,
      input.content,
      input.modelName ?? null,
      timestamp,
    ],
  );

  await touchConversation(input.conversationId);

  const result = await db.execute(
    'SELECT id FROM messages WHERE client_uuid = ?',
    [clientUuid],
  );
  const id = Number(rowString((result.rows[0] ?? {}) as SqlRow, 'id'));

  return {
    id,
    client_uuid: clientUuid,
    conversation_id: input.conversationId,
    role: input.role,
    content: input.content,
    source: 'local_llama',
    model_name: input.modelName ?? null,
    sync_status: 'pending',
    client_created_at: timestamp,
  };
};

export const deleteConversation = async (conversationId: number): Promise<void> => {
  const db = getDatabase();
  await db.execute('DELETE FROM messages WHERE conversation_id = ?', [
    conversationId,
  ]);
  await db.execute('DELETE FROM conversations WHERE id = ?', [conversationId]);
  console.log('[NexioAI] Deleted conversation:', conversationId);
};

export const deriveTitleFromMessage = (content: string): string => {
  const trimmed = content.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= 48) {
    return trimmed || 'New chat';
  }
  return `${trimmed.slice(0, 48)}…`;
};
