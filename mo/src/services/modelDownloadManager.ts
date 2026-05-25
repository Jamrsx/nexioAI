import { downloadModel, type DownloadProgress } from './modelStorage';

export type ModelDownloadStatus = 'downloading' | 'completed' | 'failed';

export type ModelDownloadState = {
  modelId: string;
  percent: number;
  status: ModelDownloadStatus;
  error: string | null;
};

const states = new Map<string, ModelDownloadState>();
const listeners = new Set<() => void>();

const emit = (): void => {
  listeners.forEach(listener => listener());
};

export const subscribeModelDownloads = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getModelDownloadState = (
  modelId: string,
): ModelDownloadState | null => states.get(modelId) ?? null;

export const getActiveModelDownloads = (): ModelDownloadState[] =>
  Array.from(states.values()).filter(row => row.status === 'downloading');

export const isModelDownloading = (modelId: string): boolean =>
  states.get(modelId)?.status === 'downloading';

export const startModelDownload = async (
  modelId: string,
  options?: { setActive?: boolean },
): Promise<string> => {
  if (isModelDownloading(modelId)) {
    console.log('[NexioAI] Download already running:', modelId);
    return '';
  }

  states.set(modelId, {
    modelId,
    percent: 0,
    status: 'downloading',
    error: null,
  });
  emit();

  try {
    const path = await downloadModel(
      modelId,
      (progress: DownloadProgress) => {
        states.set(modelId, {
          modelId,
          percent: progress.percent,
          status: 'downloading',
          error: null,
        });
        emit();
      },
      { setActive: options?.setActive ?? true },
    );

    states.set(modelId, {
      modelId,
      percent: 100,
      status: 'completed',
      error: null,
    });
    emit();

    setTimeout(() => {
      const current = states.get(modelId);
      if (current?.status === 'completed') {
        states.delete(modelId);
        emit();
      }
    }, 4000);

    console.log('[NexioAI] Model download finished:', modelId);
    return path;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Download failed';
    states.set(modelId, {
      modelId,
      percent: 0,
      status: 'failed',
      error: message,
    });
    emit();
    console.error('[NexioAI] Model download failed:', modelId, message);
    throw err;
  }
};
