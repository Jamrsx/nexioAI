export type SyncConversationPayload = {
  client_uuid: string;
  title?: string | null;
  model_name?: string | null;
  updated_at?: string;
};

export type SyncMessagePayload = {
  client_uuid: string;
  conversation_client_uuid: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  source?: string;
  model_name?: string | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  device_id?: string | null;
  app_version?: string | null;
  client_created_at?: string;
};

export type SyncBatchPayload = {
  conversations: SyncConversationPayload[];
  messages: SyncMessagePayload[];
};

export type SyncBatchResponse = {
  synced_at: string;
  conversations: Record<string, number>;
  messages: Record<string, number>;
};

export type SyncRunResult = {
  ok: boolean;
  syncedConversations: number;
  syncedMessages: number;
  skippedReason?: string;
  error?: string;
};
