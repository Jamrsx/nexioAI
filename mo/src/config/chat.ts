/** System prompt for on-device TinyLlama (ChatML / jinja). */
export const CHAT_SYSTEM_PROMPT =
  'You are NexioAI, a helpful assistant running on the user\'s phone. ' +
  'Answer clearly and accurately. Keep replies compact: short paragraphs or bullets, no filler or repetition. ' +
  'Cover what the user asked without padding length. If unsure, say so in one sentence.';

/** Max prior messages considered before context trimming. */
export const CHAT_HISTORY_LIMIT = 16;

/** Soft cap on estimated tokens stored per conversation (sync / history budget). */
export const CONVERSATION_TOKEN_BUDGET = 200_000;

/** Target max tokens for each assistant reply on device. */
export const CHAT_MAX_OUTPUT_TOKENS = 640;

/** Reserve ~40% of n_ctx for the reply; rest is for system + history prompt. */
export const CHAT_PROMPT_CONTEXT_RATIO = 0.6;
