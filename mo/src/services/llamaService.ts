import type { LlamaContext } from 'llama.rn';
import type { RNLlamaOAICompatibleMessage } from 'llama.rn';
import {
  CHAT_HISTORY_LIMIT,
  CHAT_MAX_OUTPUT_TOKENS,
  CHAT_PROMPT_CONTEXT_RATIO,
  CHAT_SYSTEM_PROMPT,
} from '../config/chat';
import { ensureDatabaseReady } from '../db/database';
import type { LocalMessage } from '../types/chat';
import { estimateNextPromptTokens } from '../utils/tokenEstimate';
import { getActiveModel } from './modelStorage';

let context: LlamaContext | null = null;
let loadedModelId: string | null = null;
let loadPromise: Promise<boolean> | null = null;
let completionChain: Promise<unknown> = Promise.resolve();

const CHATML_EOS = '</s>';
const BUSY_RETRY_DELAY_MS = 200;
const BUSY_MAX_RETRIES = 2;

export const isLlamaReady = (): boolean => context !== null;

const isContextBusyError = (err: unknown): boolean => {
  const msg = err instanceof Error ? err.message : String(err);
  return /context is busy/i.test(msg);
};

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

async function safeStopGeneration(ctx: LlamaContext): Promise<void> {
  try {
    ctx.stopCompletion();
  } catch (err) {
    console.log('[NexioAI] stopCompletion:', err);
  }
}

/** Serialize all llama work so only one completion runs at a time. */
function withCompletionLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = completionChain.then(() => fn());
  completionChain = run.catch(() => undefined);
  return run;
}

export const releaseLlama = async (): Promise<void> => {
  await completionChain.catch(() => undefined);

  if (loadPromise) {
    await loadPromise.catch(() => false);
  }

  if (context) {
    await safeStopGeneration(context);
    try {
      await context.release();
    } catch (err) {
      console.error('[NexioAI] releaseLlama error:', err);
    }
  }
  context = null;
  loadedModelId = null;
};

/** Clear KV cache when switching chats or models — not between every message. */
export const clearLlamaConversationCache = async (): Promise<void> => {
  await completionChain.catch(() => undefined);
  if (!context) {
    return;
  }

  await safeStopGeneration(context);
  try {
    await context.clearCache(false);
    console.log('[NexioAI] Llama conversation cache cleared');
  } catch (err) {
    if (isContextBusyError(err)) {
      await delay(BUSY_RETRY_DELAY_MS);
      await safeStopGeneration(context);
      try {
        await context.clearCache(false);
      } catch (retryErr) {
        console.warn('[NexioAI] clearCache retry failed:', retryErr);
      }
      return;
    }
    console.warn('[NexioAI] clearCache failed:', err);
  }
};

const runInitLlama = async (): Promise<boolean> => {
  await ensureDatabaseReady();
  const active = await getActiveModel();
  if (!active) {
    console.log('[NexioAI] No active model on disk');
    return false;
  }

  if (context && loadedModelId === active.modelId) {
    return true;
  }

  if (context) {
    await releaseLlama();
  }

  try {
    const { initLlama: loadModel } = await import('llama.rn');
    console.log('[NexioAI] Loading llama model:', active.entry.name, active.filePath);
    context = await loadModel({
      model: active.filePath,
      n_ctx: active.entry.contextSize,
      n_gpu_layers: 0,
    });
    loadedModelId = active.modelId;
    console.log('[NexioAI] Llama model ready:', active.modelId);
    return true;
  } catch (err) {
    console.error('[NexioAI] initLlama failed:', err);
    context = null;
    loadedModelId = null;
    return false;
  }
};

export const initLlama = async (): Promise<boolean> => {
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = runInitLlama().finally(() => {
    loadPromise = null;
  });

  return loadPromise;
};

const trimHistory = (messages: LocalMessage[]): LocalMessage[] => {
  if (messages.length <= CHAT_HISTORY_LIMIT) {
    return messages;
  }
  return messages.slice(-CHAT_HISTORY_LIMIT);
};

/** Drop oldest messages when the prompt would crowd out the reply budget. */
const trimHistoryForContext = (
  messages: LocalMessage[],
  nCtx: number,
): LocalMessage[] => {
  let trimmed = trimHistory(messages);
  const maxPromptTokens = Math.floor(nCtx * CHAT_PROMPT_CONTEXT_RATIO);

  while (
    trimmed.length > 0 &&
    estimateNextPromptTokens(trimmed, '', nCtx) > maxPromptTokens
  ) {
    trimmed = trimmed.slice(1);
  }

  if (trimmed.length < messages.length) {
    console.log('[NexioAI] History trimmed for context:', {
      kept: trimmed.length,
      dropped: messages.length - trimmed.length,
      nCtx,
    });
  }

  return trimmed;
};

const resolveMaxPredict = (
  history: LocalMessage[],
  catalogMax: number,
  nCtx: number,
): number => {
  const promptTokens = estimateNextPromptTokens(history, '', nCtx);
  const available = nCtx - promptTokens - 32;
  const cap = Math.min(catalogMax, CHAT_MAX_OUTPUT_TOKENS);
  const resolved = Math.min(cap, Math.max(160, available));

  console.log('[NexioAI] n_predict resolved:', resolved, {
    promptTokens,
    nCtx,
    catalogMax,
  });

  return resolved;
};

const toOaiMessages = (history: LocalMessage[]): RNLlamaOAICompatibleMessage[] => {
  const oai: RNLlamaOAICompatibleMessage[] = [
    { role: 'system', content: CHAT_SYSTEM_PROMPT },
  ];

  for (const message of history) {
    if (message.role === 'user' || message.role === 'assistant') {
      oai.push({ role: message.role, content: message.content });
    }
  }

  return oai;
};

/** TinyLlama-1.1B-Chat-v1.0 ChatML fallback when jinja is unavailable. */
const buildChatMLPrompt = (history: LocalMessage[]): string => {
  const lines: string[] = [
    `<|system|>\n${CHAT_SYSTEM_PROMPT}${CHATML_EOS}`,
  ];

  for (const message of history) {
    if (message.role === 'user') {
      lines.push(`<|user|>\n${message.content}${CHATML_EOS}`);
    } else if (message.role === 'assistant') {
      lines.push(`<|assistant|>\n${message.content}${CHATML_EOS}`);
    }
  }

  lines.push('<|assistant|>\n');
  return lines.join('\n');
};

const sanitizeModelOutput = (raw: string): string => {
  let text = raw.trim();
  text = text.replace(/<\|[^|]+\|>/g, '');
  text = text.replace(/<\/s>/g, '');
  text = text.replace(/^(Assistant|User|System):\s*/gim, '');
  return text.trim();
};

/** ChatML stop tokens only — plain "User:" strings could end replies too early. */
const STOP_SEQUENCES = [CHATML_EOS, '<|user|>', '<|system|>', '<|assistant|>'];

const modelUnavailableMessage = (activeName: string | null): string => {
  if (!activeName) {
    return (
      'No GGUF model file found on this device. Open Settings → Manage offline models, ' +
      'download any TinyLlama variant, then tap Set as active.'
    );
  }

  return (
    `Could not load ${activeName}. Open Settings → Manage offline models and tap Set as active again, ` +
    'or try a new chat after the model finishes loading.'
  );
};

type CompletionParams = {
  messages: RNLlamaOAICompatibleMessage[];
  history: LocalMessage[];
  maxPredict: number;
};

async function runCompletionOnce(
  ctx: LlamaContext,
  params: CompletionParams,
): Promise<{ text?: string }> {
  const { messages, history, maxPredict } = params;

  try {
    return await ctx.completion({
      messages,
      jinja: true,
      add_generation_prompt: true,
      enable_thinking: false,
      n_predict: maxPredict,
      temperature: 0.65,
      top_p: 0.9,
      top_k: 40,
      stop: STOP_SEQUENCES,
    });
  } catch (jinjaErr) {
    console.warn('[NexioAI] jinja completion failed, using ChatML prompt:', jinjaErr);
    if (isContextBusyError(jinjaErr)) {
      await safeStopGeneration(ctx);
      await delay(BUSY_RETRY_DELAY_MS);
    }

    const prompt = buildChatMLPrompt(history);
    return await ctx.completion({
      prompt,
      jinja: false,
      n_predict: maxPredict,
      temperature: 0.65,
      top_p: 0.9,
      top_k: 40,
      stop: STOP_SEQUENCES,
    });
  }
}

async function runCompletionWithRetry(
  ctx: LlamaContext,
  params: CompletionParams,
): Promise<{ text?: string }> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= BUSY_MAX_RETRIES; attempt += 1) {
    try {
      return await runCompletionOnce(ctx, params);
    } catch (err) {
      lastError = err;
      if (!isContextBusyError(err) || attempt >= BUSY_MAX_RETRIES) {
        throw err;
      }
      console.warn('[NexioAI] Context busy, retrying completion:', attempt + 1);
      await safeStopGeneration(ctx);
      await delay(BUSY_RETRY_DELAY_MS * (attempt + 1));
    }
  }

  throw lastError;
}

const generateAssistantReplyInner = async (
  history: LocalMessage[],
): Promise<{ content: string; modelName: string | null }> => {
  const active = await getActiveModel();
  const ready = await initLlama();

  if (!active) {
    return {
      content: modelUnavailableMessage(null),
      modelName: null,
    };
  }

  if (!ready || !context) {
    return {
      content: modelUnavailableMessage(active.entry.name),
      modelName: active.entry.filename,
    };
  }

  const nCtx = active.entry.contextSize;
  const trimmedHistory = trimHistoryForContext(history, nCtx);
  const messages = toOaiMessages(trimmedHistory);
  const maxPredict = resolveMaxPredict(
    trimmedHistory,
    active.entry.maxPredict,
    nCtx,
  );
  const ctx = context;

  try {
    console.log('[NexioAI] llama completion start:', active.modelId, {
      historyMessages: messages.length - 1,
      maxPredict,
    });

    const result = await runCompletionWithRetry(ctx, {
      messages,
      history: trimmedHistory,
      maxPredict,
    });

    const text = sanitizeModelOutput(result.text ?? '');
    console.log('[NexioAI] llama completion done, length:', text.length);

    return {
      content:
        text ||
        'The model returned an empty reply. Try sending a shorter message.',
      modelName: active.entry.filename,
    };
  } catch (err) {
    console.error('[NexioAI] completion error:', err);
    const busy = isContextBusyError(err);
    return {
      content: busy
        ? 'The model is still finishing a previous reply. Wait a moment and try again.'
        : `Local model (${active.entry.name}) failed to generate a reply. Try again or pick another downloaded model in Settings.`,
      modelName: active.entry.filename,
    };
  }
};

export const generateAssistantReply = async (
  history: LocalMessage[],
): Promise<{ content: string; modelName: string | null }> =>
  withCompletionLock(() => generateAssistantReplyInner(history));
