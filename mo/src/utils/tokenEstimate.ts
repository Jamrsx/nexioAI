import {
  CHAT_HISTORY_LIMIT,
  CHAT_SYSTEM_PROMPT,
  CONVERSATION_TOKEN_BUDGET,
} from '../config/chat';
import type { LocalMessage } from '../types/chat';

/** ~3.5 characters per token for English-ish chat text. */
export const estimateTokens = (text: string): number =>
  Math.max(0, Math.ceil(text.trim().length / 3.5));

const MESSAGE_OVERHEAD_TOKENS = 8;

export const estimateMessageTokens = (message: LocalMessage): number =>
  estimateTokens(message.content) + MESSAGE_OVERHEAD_TOKENS;

/** Total tokens stored in this conversation (all roles). */
export const estimateConversationTokens = (messages: LocalMessage[]): number => {
  let total = estimateTokens(CHAT_SYSTEM_PROMPT);
  for (const message of messages) {
    if (message.role === 'system') {
      continue;
    }
    total += estimateMessageTokens(message);
  }
  return total;
};

/** Tokens for the next model call (system + recent history + optional draft). */
export const estimateNextPromptTokens = (
  messages: LocalMessage[],
  draft = '',
  contextLimit?: number,
): number => {
  const recent = messages.slice(-CHAT_HISTORY_LIMIT);
  let trimmed = [...recent];

  if (contextLimit) {
    const maxPrompt = Math.floor(contextLimit * 0.6);
    while (trimmed.length > 0 && estimateHistoryTokens(trimmed) > maxPrompt) {
      trimmed = trimmed.slice(1);
    }
  }

  let total = estimateTokens(CHAT_SYSTEM_PROMPT) + 16;
  for (const message of trimmed) {
    if (message.role === 'user' || message.role === 'assistant') {
      total += estimateMessageTokens(message);
    }
  }

  if (draft.trim()) {
    total += estimateTokens(draft) + 4;
  }

  return total;
};

export const estimateHistoryTokens = (messages: LocalMessage[]): number => {
  let total = 0;
  for (const message of messages) {
    if (message.role === 'user' || message.role === 'assistant') {
      total += estimateMessageTokens(message);
    }
  }
  return total;
};

export const formatTokenCount = (count: number): string => {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return String(count);
};

export type ContextUsage = {
  promptTokens: number;
  contextLimit: number;
  conversationTokens: number;
  conversationBudget: number;
};

export const buildContextUsage = (
  messages: LocalMessage[],
  contextLimit: number,
  draft = '',
): ContextUsage => ({
  promptTokens: estimateNextPromptTokens(messages, draft, contextLimit),
  contextLimit,
  conversationTokens: estimateConversationTokens(messages),
  conversationBudget: CONVERSATION_TOKEN_BUDGET,
});

export const getContextPressure = (
  usage: ContextUsage,
): 'ok' | 'warm' | 'high' | 'critical' => {
  const ctxRatio = usage.promptTokens / Math.max(1, usage.contextLimit);
  const convRatio =
    usage.conversationTokens / Math.max(1, usage.conversationBudget);

  if (ctxRatio >= 0.88 || convRatio >= 0.92) {
    return 'critical';
  }
  if (ctxRatio >= 0.72 || convRatio >= 0.8) {
    return 'high';
  }
  if (ctxRatio >= 0.55 || convRatio >= 0.65) {
    return 'warm';
  }
  return 'ok';
};
