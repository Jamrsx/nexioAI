import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LogoPlaceholder } from '../components/LogoPlaceholder';
import { PrimaryButton } from '../components/PrimaryButton';
import { ModelProgressBar } from '../components/models/ModelProgressBar';
import { SettingsGroup } from '../components/settings/SettingsGroup';
import { SettingsRow } from '../components/settings/SettingsRow';
import { SettingsSectionHeader } from '../components/settings/SettingsSectionHeader';
import {
  SettingsStatusLine,
  type StatusTone,
} from '../components/settings/SettingsStatusLine';
import { getApiBaseUrl } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { useModelDownloads } from '../context/ModelDownloadContext';
import { useSync } from '../context/SyncContext';
import { ensureDatabaseReady } from '../db/database';
import { seedPendingTestConversation } from '../db/syncRepository';
import { getActiveModel } from '../services/modelStorage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../navigation/AppNavigator';
import { storagePaths } from '../storage/paths';
import { colors } from '../theme/colors';

type InitState = {
  loading: boolean;
  error: string | null;
  dbReady: boolean;
};

const syncStatusCopy = (
  status: string,
  pendingMessages: number,
): { message: string; tone: StatusTone } => {
  switch (status) {
    case 'syncing':
      return { message: 'Syncing to server…', tone: 'active' };
    case 'success':
      return { message: 'Up to date with server', tone: 'success' };
    case 'error':
      return { message: 'Sync failed — tap Sync now', tone: 'error' };
    case 'offline':
      return {
        message: 'Offline — will sync when connected',
        tone: 'warning',
      };
    default:
      return pendingMessages > 0
        ? {
            message: `${pendingMessages} message(s) waiting to sync`,
            tone: 'warning',
          }
        : { message: 'All local messages synced', tone: 'success' };
  }
};

type Props = NativeStackScreenProps<MainStackParamList, 'Settings'>;

export function HomeScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { downloads: modelDownloads } = useModelDownloads();
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
  const [refreshing, setRefreshing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [activeModelName, setActiveModelName] = useState<string | null>(null);

  const refreshSettings = useCallback(async () => {
    await refreshPendingCounts();
    const active = await getActiveModel();
    setActiveModelName(active?.entry.name ?? null);
  }, [refreshPendingCounts]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        console.log('[NexioAI] Settings bootstrap start');
        await ensureDatabaseReady();
        setState({ loading: false, error: null, dbReady: true });
        await refreshSettings();
        console.log('[NexioAI] Settings bootstrap done');
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Initialization failed';
        console.error('[NexioAI] Bootstrap error:', message);
        setState({ loading: false, error: message, dbReady: false });
      }
    };

    bootstrap();
  }, [refreshSettings]);

  useFocusEffect(
    useCallback(() => {
      if (state.dbReady) {
        refreshSettings();
      }
    }, [state.dbReady, refreshSettings]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (!state.dbReady) {
        await ensureDatabaseReady();
        setState({ loading: false, error: null, dbReady: true });
      }
      await refreshSettings();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Refresh failed';
      setState(prev => ({ ...prev, error: message }));
    } finally {
      setRefreshing(false);
    }
  }, [state.dbReady, refreshSettings]);

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
      const message =
        err instanceof Error ? err.message : 'Could not create test chat';
      Alert.alert('Error', message);
    } finally {
      setSeeding(false);
    }
  };

  const syncCopy = syncStatusCopy(syncStatus, pendingMessages);
  const modelDownloadPercent = useMemo(() => {
    if (modelDownloads.length === 0) {
      return 0;
    }
    return Math.round(
      modelDownloads.reduce((sum, d) => sum + d.percent, 0) /
        modelDownloads.length,
    );
  }, [modelDownloads]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }>
      <View style={styles.profileCard}>
        <View style={styles.profileMain}>
          <View style={styles.avatarRing}>
            <LogoPlaceholder size="small" />
          </View>
          <View style={styles.profileText}>
            <Text style={styles.profileName} numberOfLines={1}>
              {user?.name ?? 'Signed in'}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {user?.email ?? '—'}
            </Text>
          </View>
        </View>
        <Text style={styles.profileHint}>
          Account, sync, and on-device AI configuration.
        </Text>
      </View>

      {state.loading && (
        <View style={styles.feedbackCard}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.feedbackText}>
            Preparing local storage and database…
          </Text>
        </View>
      )}

      {state.error && (
        <View style={[styles.feedbackCard, styles.feedbackError]}>
          <Text style={styles.feedbackErrorText}>{state.error}</Text>
        </View>
      )}

      {state.dbReady && (
        <>
          <SettingsSectionHeader title="Offline AI" />
          <SettingsGroup>
            <SettingsStatusLine
              label="Active model"
              value={
                activeModelName ??
                'No model selected — open catalog to download'
              }
              tone={activeModelName ? 'success' : 'warning'}
            />
            {modelDownloads.length > 0 && (
              <View style={styles.progressInset}>
                <ModelProgressBar
                  percent={modelDownloadPercent}
                  label={
                    modelDownloads.length === 1
                      ? 'Model download'
                      : `${modelDownloads.length} downloads`
                  }
                />
              </View>
            )}
            <SettingsRow
              title="Manage offline models"
              subtitle="Download, remove, and switch GGUF models"
              onPress={() => navigation.navigate('Models')}
              isLast
            />
          </SettingsGroup>

          <SettingsSectionHeader title="Sync" />
          <SettingsGroup>
            <SettingsStatusLine
              label="Status"
              value={syncCopy.message}
              tone={syncCopy.tone}
              loading={syncStatus === 'syncing'}
            />
            <View style={styles.metricsRow}>
              <View style={styles.metricChip}>
                <Text style={styles.metricValue}>{pendingConversations}</Text>
                <Text style={styles.metricLabel}>Chats pending</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricChip}>
                <Text style={styles.metricValue}>{pendingMessages}</Text>
                <Text style={styles.metricLabel}>Msgs pending</Text>
              </View>
            </View>
            {lastSyncedAt && (
              <Text style={styles.metaLine}>
                Last sync · {new Date(lastSyncedAt).toLocaleString()}
              </Text>
            )}
            {lastError && (
              <Text style={styles.errorLine}>{lastError}</Text>
            )}
          </SettingsGroup>

          <PrimaryButton
            title="Sync now"
            onPress={() => runSync()}
            loading={syncStatus === 'syncing'}
            style={styles.primaryAction}
          />

          <SettingsSectionHeader title="Tools" />
          <SettingsGroup>
            <SettingsRow
              title="Add test offline chat"
              subtitle="Creates sample messages for sync testing"
              onPress={handleSeedTestChat}
              loading={seeding}
              isLast
            />
          </SettingsGroup>

          <SettingsSectionHeader title="System" />
          <SettingsGroup>
            <View style={styles.systemRow}>
              <Text style={styles.systemLabel}>API endpoint</Text>
              <Text style={styles.systemValue} selectable>
                {getApiBaseUrl()}
              </Text>
            </View>
            <View style={[styles.systemRow, styles.systemRowBorder]}>
              <Text style={styles.systemLabel}>Database</Text>
              <Text style={styles.systemValue} selectable numberOfLines={2}>
                {storagePaths.databaseFile || '—'}
              </Text>
            </View>
          </SettingsGroup>
        </>
      )}

      <Pressable
        onPress={() => logout()}
        style={({ pressed }) => [
          styles.signOutBtn,
          pressed && styles.signOutPressed,
        ]}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 36,
  },
  profileCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  profileMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarRing: {
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(0, 123, 255, 0.35)',
    padding: 2,
  },
  profileText: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  profileEmail: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  profileHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 12,
  },
  feedbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  feedbackText: {
    color: colors.textMuted,
    fontSize: 13,
    flex: 1,
  },
  feedbackError: {
    borderColor: 'rgba(239, 68, 68, 0.45)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  feedbackErrorText: {
    color: colors.danger,
    fontSize: 13,
    flex: 1,
  },
  progressInset: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  metricsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  metricChip: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  metricValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  metaLine: {
    color: colors.textMuted,
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  errorLine: {
    color: colors.danger,
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    lineHeight: 16,
  },
  primaryAction: {
    marginTop: 12,
  },
  systemRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  systemRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  systemLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  systemValue: {
    color: colors.text,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
    fontFamily: 'monospace',
  },
  signOutBtn: {
    marginTop: 28,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.45)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    alignItems: 'center',
  },
  signOutPressed: {
    opacity: 0.88,
  },
  signOutText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '600',
  },
});
