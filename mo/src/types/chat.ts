export type SyncStatus = 'pending' | 'synced';

export type LocalConversation = {
  id: number;
  client_uuid: string;
  title: string | null;
  model_name: string | null;
  sync_status: SyncStatus;
  updated_at: string;
};

export type LocalMessage = {
  id: number;
  client_uuid: string;
  conversation_id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  source: string;
  model_name: string | null;
  sync_status: SyncStatus;
  client_created_at: string;
};

export type ChatMessageRole = LocalMessage['role'];
