import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  createConversation,
  deleteConversation as deleteConversationRecord,
  deriveTitleFromMessage,
  getConversationById,
  insertMessage,
  listConversations,
  listMessages,
  updateConversationTitle,
} from '../db/chatRepository';
import { ensureDatabaseReady } from '../db/database';
import type { LocalConversation, LocalMessage } from '../types/chat';
import {
  clearLlamaConversationCache,
  generateAssistantReply,
  initLlama,
} from '../services/llamaService';
import { useSync } from './SyncContext';

type ChatContextValue = {
  conversations: LocalConversation[];
  activeConversation: LocalConversation | null;
  messages: LocalMessage[];
  isSending: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  refreshConversations: () => Promise<void>;
  selectConversation: (id: number) => Promise<void>;
  startNewChat: () => Promise<void>;
  deleteConversation: (id: number) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
};

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { runSync, refreshPendingCounts } = useSync();
  const [conversations, setConversations] = useState<LocalConversation[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<LocalConversation | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const refreshConversations = useCallback(async () => {
    const rows = await listConversations();
    setConversations(rows);
    console.log('[NexioAI] Conversations loaded:', rows.length);
  }, []);

  const loadMessages = useCallback(async (conversationId: number) => {
    const rows = await listMessages(conversationId);
    setMessages(rows);
  }, []);

  const selectConversation = useCallback(
    async (id: number) => {
      const conversation = await getConversationById(id);
      if (!conversation) {
        return;
      }

      setActiveConversation(conversation);
      await loadMessages(id);
      await clearLlamaConversationCache();
      setSidebarOpen(false);
      console.log('[NexioAI] Selected conversation:', id);
    },
    [loadMessages],
  );

  const startNewChat = useCallback(async () => {
    const conversation = await createConversation();
    await refreshConversations();
    setActiveConversation(conversation);
    setMessages([]);
    await clearLlamaConversationCache();
    setSidebarOpen(false);
    console.log('[NexioAI] New chat started:', conversation.id);
  }, [refreshConversations]);

  const deleteConversation = useCallback(
    async (id: number) => {
      await ensureDatabaseReady();
      await deleteConversationRecord(id);
      console.log('[NexioAI] Removed conversation from device:', id);

      const remaining = await listConversations();
      setConversations(remaining);

      if (activeConversation?.id === id) {
        if (remaining.length > 0) {
          const next = remaining[0];
          setActiveConversation(next);
          await loadMessages(next.id);
          await clearLlamaConversationCache();
        } else {
          const conversation = await createConversation();
          setActiveConversation(conversation);
          setMessages([]);
          setConversations([conversation]);
          await clearLlamaConversationCache();
        }
      }

      await refreshPendingCounts();
    },
    [
      activeConversation?.id,
      loadMessages,
      refreshPendingCounts,
    ],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending) {
        return;
      }

      let conversation = activeConversation;
      if (!conversation) {
        conversation = await createConversation();
        setActiveConversation(conversation);
        await refreshConversations();
      }

      setIsSending(true);

      try {
        await ensureDatabaseReady();

        const userMessage = await insertMessage({
          conversationId: conversation.id,
          role: 'user',
          content: trimmed,
        });

        const nextMessages = [...messages, userMessage];
        setMessages(nextMessages);

        if (
          !conversation.title ||
          conversation.title === 'New chat' ||
          messages.length === 0
        ) {
          const title = deriveTitleFromMessage(trimmed);
          await updateConversationTitle(conversation.id, title);
          conversation = { ...conversation, title };
          setActiveConversation(conversation);
        }

        const { content, modelName } = await generateAssistantReply(nextMessages);

        const assistantMessage = await insertMessage({
          conversationId: conversation.id,
          role: 'assistant',
          content,
          modelName,
        });

        setMessages(current => [...current, assistantMessage]);
        await refreshConversations();
        await refreshPendingCounts();
        // Online: upload pending chats to MySQL. Offline: stays local until connected.
        runSync();
      } finally {
        setIsSending(false);
      }
    },
    [
      activeConversation,
      isSending,
      messages,
      refreshConversations,
      refreshPendingCounts,
      runSync,
    ],
  );

  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (bootstrappedRef.current) {
      return;
    }
    bootstrappedRef.current = true;

    const bootstrap = async () => {
      await ensureDatabaseReady();
      const llamaOk = await initLlama();
      console.log('[NexioAI] Chat bootstrap — local model loaded:', llamaOk);
      await refreshConversations();
      const rows = await listConversations();
      if (rows.length > 0) {
        await selectConversation(rows[0].id);
      } else {
        await startNewChat();
      }
    };

    bootstrap();
  }, [refreshConversations, selectConversation, startNewChat]);

  const value = useMemo(
    () => ({
      conversations,
      activeConversation,
      messages,
      isSending,
      sidebarOpen,
      setSidebarOpen,
      refreshConversations,
      selectConversation,
      startNewChat,
      deleteConversation,
      sendMessage,
    }),
    [
      conversations,
      activeConversation,
      messages,
      isSending,
      sidebarOpen,
      refreshConversations,
      selectConversation,
      startNewChat,
      deleteConversation,
      sendMessage,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChat must be used within ChatProvider');
  }

  return ctx;
}
