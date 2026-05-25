import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LogoPlaceholder } from '../components/LogoPlaceholder';
import { PrimaryButton } from '../components/PrimaryButton';
import { getApiBaseUrl } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { initDatabase } from '../db/database';
import { seedPendingTestConversation } from '../db/syncRepository';
import { initializeStoragePaths, storagePaths } from '../storage/paths';
import { colors } from '../theme/colors';

type InitState = {
  loading: boolean;
  error: string | null;
  dbReady: boolean;
};

const syncStatusLabel = (
  status: string,
  pendingMessages: number,
): string => {
  switch (status) {
    case 'syncing':
      return 'Syncing to server…';
    case 'success':
      return 'Last sync succeeded';
    case 'error':
      return 'Sync failed — tap Sync now to retry';
    case 'offline':
      return 'Offline — pending items will sync when online';
    default:
      return pendingMessages > 0
        ? 'Pending items waiting to sync'
        : 'All local messages synced';
  }
};

export function HomeScreen() {
  const { user, logout } = useAuth();
  const {
    status: syncStatus,
    pendingConversations,
    pendingMessages,
    lastSyncedAt,
    lastError,
    refreshPendingCounts,
    runSync,
  } = useSync();
  const [state, setState] = useState<InitState>({
    loading: true,
    error: null,
    dbReady: false,
  });
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        console.log('[NexioAI] HomeScreen bootstrap start');
        await initializeStoragePaths();
        await initDatabase();
        setState({ loading: false, error: null, dbReady: true });
        await refreshPendingCounts();
        console.log('[NexioAI] HomeScreen bootstrap done');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Initialization failed';
        console.error('[NexioAI] Bootstrap error:', message);
        setState({ loading: false, error: message, dbReady: false });
      }
    };

    bootstrap();
  }, [refreshPendingCounts]);

  const handleSeedTestChat = async () => {
    setSeeding(true);
    try {
      const ids = await seedPendingTestConversation();
      await refreshPendingCounts();
      console.log('[NexioAI] Test chat seeded:', ids);
      Alert.alert(
        'Test chat added',
        'Two offline messages are pending. Tap Sync now or wait until you are online.',
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create test chat';
      Alert.alert('Error', message);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <LogoPlaceholder size="large" />

      <Text style={styles.heading}>
        Hello{user ? `, ${user.name}` : ''}
      </Text>
      <Text style={styles.body}>
        Chunk 5: conversations and messages sync to MySQL when you are online.
      </Text>

      {state.loading && (
        <View style={styles.statusCard}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.statusText}>Setting up storage and database…</Text>
        </View>
      )}

      {state.error && (
        <View style={[styles.statusCard, styles.errorCard]}>
          <Text style={styles.errorText}>{state.error}</Text>
        </View>
      )}

      {state.dbReady && (
        <>
          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>Sync</Text>
            <Text style={styles.statusValue}>
              {syncStatusLabel(syncStatus, pendingMessages)}
            </Text>
            <Text style={[styles.statusValue, styles.mt]}>
              Pending: {pendingConversations} conversation(s), {pendingMessages}{' '}
              message(s)
            </Text>
            {lastSyncedAt && (
              <Text style={[styles.statusMuted, styles.mt]}>
                Last synced: {new Date(lastSyncedAt).toLocaleString()}
              </Text>
            )}
            {lastError && (
              <Text style={[styles.errorText, styles.mt]}>{lastError}</Text>
            )}
            {syncStatus === 'syncing' && (
              <ActivityIndicator
                color={colors.primary}
                style={styles.syncSpinner}
              />
            )}
          </View>

          <PrimaryButton
            title="Sync now"
            onPress={() => runSync()}
            loading={syncStatus === 'syncing'}
            style={styles.actionBtn}
          />

          <PrimaryButton
            title="Add test offline chat"
            variant="secondary"
            onPress={handleSeedTestChat}
            loading={seeding}
            style={styles.actionBtn}
          />

          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>API</Text>
            <Text style={styles.statusValue}>{getApiBaseUrl()}</Text>

            <Text style={[styles.statusLabel, styles.mt]}>Database</Text>
            <Text style={styles.statusValue}>{storagePaths.databaseFile}</Text>

            {user && (
              <>
                <Text style={[styles.statusLabel, styles.mt]}>Signed in as</Text>
                <Text style={styles.statusValue}>{user.email}</Text>
              </>
            )}
          </View>
        </>
      )}

      <PrimaryButton
        title="Sign out"
        variant="danger"
        onPress={() => logout()}
        style={styles.logout}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    alignItems: 'center',
  },
  heading: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '600',
    marginTop: 24,
    textAlign: 'center',
  },
  body: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
  },
  statusCard: {
    width: '100%',
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorCard: {
    borderColor: colors.danger,
  },
  statusText: {
    color: colors.textMuted,
    marginTop: 12,
    textAlign: 'center',
  },
  statusLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusValue: {
    color: colors.text,
    fontSize: 13,
    marginTop: 4,
  },
  statusMuted: {
    color: colors.textMuted,
    fontSize: 12,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
  mt: {
    marginTop: 8,
  },
  syncSpinner: {
    marginTop: 12,
  },
  actionBtn: {
    width: '100%',
    marginTop: 12,
  },
  logout: {
    width: '100%',
    marginTop: 20,
  },
});
