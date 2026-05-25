import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { getPendingCounts } from '../services/syncService';
import { syncPending } from '../services/syncService';
import { useAuth } from './AuthContext';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

type SyncContextValue = {
  status: SyncStatus;
  pendingConversations: number;
  pendingMessages: number;
  lastSyncedAt: string | null;
  lastError: string | null;
  refreshPendingCounts: () => Promise<void>;
  runSync: () => Promise<void>;
};

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

const isOnline = (state: NetInfoState | null): boolean => {
  if (!state?.isConnected) {
    return false;
  }

  return state.isInternetReachable !== false;
};

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [pendingConversations, setPendingConversations] = useState(0);
  const [pendingMessages, setPendingMessages] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const syncingRef = useRef(false);

  const refreshPendingCounts = useCallback(async () => {
    try {
      const counts = await getPendingCounts();
      setPendingConversations(counts.conversations);
      setPendingMessages(counts.messages);
      console.log('[NexioAI] Pending sync:', counts);
    } catch (err) {
      console.error('[NexioAI] refreshPendingCounts error:', err);
    }
  }, []);

  const runSync = useCallback(async () => {
    if (!isAuthenticated || syncingRef.current) {
      return;
    }

    const netState = await NetInfo.fetch();
    if (!isOnline(netState)) {
      setStatus('offline');
      setLastError(null);
      console.log('[NexioAI] Sync skipped — offline');
      return;
    }

    syncingRef.current = true;
    setStatus('syncing');
    setLastError(null);

    try {
      const result = await syncPending();

      if (result.skippedReason === 'nothing_pending') {
        setStatus('idle');
      } else if (result.ok) {
        setStatus('success');
        setLastSyncedAt(new Date().toISOString());
        setLastError(null);
      } else {
        setStatus('error');
        setLastError(result.error ?? 'Sync failed');
      }
    } finally {
      syncingRef.current = false;
      await refreshPendingCounts();
    }
  }, [isAuthenticated, refreshPendingCounts]);

  useEffect(() => {
    if (!isAuthenticated) {
      setStatus('idle');
      setPendingConversations(0);
      setPendingMessages(0);
      return;
    }

    refreshPendingCounts();
  }, [isAuthenticated, refreshPendingCounts]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const unsubscribe = NetInfo.addEventListener(state => {
      console.log('[NexioAI] NetInfo:', {
        connected: state.isConnected,
        reachable: state.isInternetReachable,
      });

      if (isOnline(state)) {
        runSync();
      } else {
        setStatus('offline');
      }
    });

    NetInfo.fetch().then(state => {
      if (isOnline(state)) {
        runSync();
      } else {
        setStatus('offline');
      }
    });

    return unsubscribe;
  }, [isAuthenticated, runSync]);

  const value = useMemo(
    () => ({
      status,
      pendingConversations,
      pendingMessages,
      lastSyncedAt,
      lastError,
      refreshPendingCounts,
      runSync,
    }),
    [
      status,
      pendingConversations,
      pendingMessages,
      lastSyncedAt,
      lastError,
      refreshPendingCounts,
      runSync,
    ],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    throw new Error('useSync must be used within SyncProvider');
  }

  return ctx;
}
