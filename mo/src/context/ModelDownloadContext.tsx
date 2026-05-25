import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  getActiveModelDownloads,
  getModelDownloadState,
  startModelDownload,
  subscribeModelDownloads,
  type ModelDownloadState,
} from '../services/modelDownloadManager';

type ModelDownloadContextValue = {
  downloads: ModelDownloadState[];
  getDownload: (modelId: string) => ModelDownloadState | null;
  startDownload: (modelId: string, options?: { setActive?: boolean }) => Promise<string>;
};

const ModelDownloadContext = createContext<ModelDownloadContextValue | undefined>(
  undefined,
);

export function ModelDownloadProvider({ children }: { children: React.ReactNode }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    return subscribeModelDownloads(() => setTick(t => t + 1));
  }, []);

  const downloads = useMemo(() => getActiveModelDownloads(), [tick]);

  const getDownload = useCallback(
    (modelId: string) => getModelDownloadState(modelId),
    [tick],
  );

  const startDownload = useCallback(
    (modelId: string, options?: { setActive?: boolean }) =>
      startModelDownload(modelId, options),
    [],
  );

  const value = useMemo(
    () => ({ downloads, getDownload, startDownload }),
    [downloads, getDownload, startDownload],
  );

  return (
    <ModelDownloadContext.Provider value={value}>
      {children}
    </ModelDownloadContext.Provider>
  );
}

export function useModelDownloads(): ModelDownloadContextValue {
  const ctx = useContext(ModelDownloadContext);
  if (!ctx) {
    throw new Error('useModelDownloads must be used within ModelDownloadProvider');
  }

  return ctx;
}
