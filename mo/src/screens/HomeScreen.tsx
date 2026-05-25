import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LogoPlaceholder } from '../components/LogoPlaceholder';
import { PrimaryButton } from '../components/PrimaryButton';
import { getApiBaseUrl } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { initDatabase } from '../db/database';
import { initializeStoragePaths, storagePaths } from '../storage/paths';
import { colors } from '../theme/colors';

type InitState = {
  loading: boolean;
  error: string | null;
  dbReady: boolean;
};

export function HomeScreen() {
  const { user, logout } = useAuth();
  const [state, setState] = useState<InitState>({
    loading: true,
    error: null,
    dbReady: false,
  });

  useEffect(() => {
    const bootstrap = async () => {
      try {
        console.log('[NexioAI] HomeScreen bootstrap start');
        await initializeStoragePaths();
        await initDatabase();
        setState({ loading: false, error: null, dbReady: true });
        console.log('[NexioAI] HomeScreen bootstrap done');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Initialization failed';
        console.error('[NexioAI] Bootstrap error:', message);
        setState({ loading: false, error: message, dbReady: false });
      }
    };

    bootstrap();
  }, []);

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
        You are signed in. Chat and sync arrive in the next chunks.
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
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>API</Text>
          <Text style={styles.statusValue}>{getApiBaseUrl()}</Text>

          <Text style={[styles.statusLabel, styles.mt]}>Storage root</Text>
          <Text style={styles.statusValue}>{storagePaths.root}</Text>

          <Text style={[styles.statusLabel, styles.mt]}>Database</Text>
          <Text style={styles.statusValue}>{storagePaths.databaseFile}</Text>

          <Text style={[styles.statusLabel, styles.mt]}>Folders</Text>
          <Text style={styles.statusValue}>models · cache · data · downloads · logs</Text>

          {user && (
            <>
              <Text style={[styles.statusLabel, styles.mt]}>Signed in as</Text>
              <Text style={styles.statusValue}>{user.email}</Text>
            </>
          )}
        </View>
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
    marginTop: 28,
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
  errorText: {
    color: colors.danger,
    fontSize: 14,
  },
  mt: {
    marginTop: 12,
  },
  logout: {
    width: '100%',
    marginTop: 20,
  },
});
