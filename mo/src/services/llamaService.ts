import type { LlamaContext } from 'llama.rn';
import type { LocalMessage } from '../types/chat';
import { getActiveModel } from './modelStorage';

let context: LlamaContext | null = null;
let loadedModelId: string | null = null;
let loading = false;

export const isLlamaReady = (): boolean => context !== null;

export const releaseLlama = async (): Promise<void> => {
  if (context) {
    try {
      await context.release();
    } catch (err) {
      console.error('[NexioAI] releaseLlama error:', err);
    }
  }
  context = null;
  loadedModelId = null;
};

export const initLlama = async (): Promise<boolean> => {
  const active = await getActiveModel();
  if (!active) {
    console.log('[NexioAI] No active model on disk');
    return false;
  }

  if (context && loadedModelId === active.modelId) {
    return true;
  }

  if (loading) {
    return false;
  }

  if (context) {
    await releaseLlama();
  }

  loading = true;
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
  } finally {
    loading = false;
  }
};

const buildPrompt = (messages: LocalMessage[]): string => {
  const lines = messages.map(message => {
    const label =
      message.role === 'assistant'
        ? 'Assistant'
        : message.role === 'system'
          ? 'System'
          : 'User';
    return `${label}: ${message.content}`;
  });

  return `${lines.join('\n')}\nAssistant:`;
};

export const generateAssistantReply = async (
  history: LocalMessage[],
  userText: string,
): Promise<{ content: string; modelName: string | null }> => {
  const active = await getActiveModel();
  const ready = await initLlama();

  if (!ready || !context || !active) {
    return {
      content:
        'No on-device model is active. Open Settings → Offline models, download one, and set it as active.',
      modelName: null,
    };
  }

  const promptMessages: LocalMessage[] = [
    ...history,
    {
      id: 0,
      client_uuid: '',
      conversation_id: 0,
      role: 'user',
      content: userText,
      source: 'local_llama',
      model_name: null,
      sync_status: 'pending',
      client_created_at: new Date().toISOString(),
    },
  ];

  const prompt = buildPrompt(promptMessages);

  try {
    console.log('[NexioAI] llama completion start:', active.modelId);
    await context.clearCache(false);
    const result = await context.completion({
      prompt,
      n_predict: active.entry.maxPredict,
      temperature: 0.7,
      top_p: 0.9,
      stop: ['\nUser:', '\nAssistant:', '\nSystem:'],
    });

    const text = (result.text ?? '').trim();
    console.log('[NexioAI] llama completion done, length:', text.length);

    return {
      content: text || '(No response generated.)',
      modelName: active.entry.filename,
    };
  } catch (err) {
    console.error('[NexioAI] completion error:', err);
    return {
      content: 'Local model failed to generate a reply. Try a smaller model in Settings.',
      modelName: active.entry.filename,
    };
  }
};
