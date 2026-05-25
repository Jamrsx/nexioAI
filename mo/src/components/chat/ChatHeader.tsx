import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

type Props = {
  title: string;
  modelLabel: string | null;
  syncStatus: SyncStatus;
  canCopyConversation?: boolean;
  onMenuPress: () => void;
  onSettingsPress: () => void;
  onModelPress: () => void;
  onCopyConversation?: () => void;
};

const syncMeta: Record<
  SyncStatus,
  { label: string; dot: string; text: string }
> = {
  idle: { label: 'Synced', dot: colors.success, text: colors.textMuted },
  success: { label: 'Synced', dot: colors.success, text: colors.textMuted },
  syncing: { label: 'Syncing', dot: colors.accent, text: colors.accent },
  offline: { label: 'Offline', dot: '#f59e0b', text: '#f59e0b' },
  error: { label: 'Sync error', dot: colors.danger, text: colors.danger },
};

export function ChatHeader({
  title,
  modelLabel,
  syncStatus,
  canCopyConversation = false,
  onMenuPress,
  onSettingsPress,
  onModelPress,
  onCopyConversation,
}: Props) {
  const sync = syncMeta[syncStatus] ?? syncMeta.idle;

  return (
    <View style={styles.wrap}>
      <Pressable
        style={styles.iconBtn}
        onPress={onMenuPress}
        accessibilityLabel="Chats">
        <Text style={styles.icon}>☰</Text>
      </Pressable>

      <View style={styles.center}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.meta}>
          <Pressable
            style={styles.modelChip}
            onPress={onModelPress}
            accessibilityLabel="Change model">
            <Text style={styles.modelText} numberOfLines={1}>
              {modelLabel ?? 'Model'}
            </Text>
            <Text style={styles.chevron}>▾</Text>
          </Pressable>

          <View style={styles.syncChip}>
            {syncStatus === 'syncing' ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <View style={[styles.dot, { backgroundColor: sync.dot }]} />
            )}
            <Text style={[styles.syncText, { color: sync.text }]} numberOfLines={1}>
              {sync.label}
            </Text>
          </View>
        </View>
      </View>

      <Pressable
        style={[styles.iconBtn, !canCopyConversation && styles.iconBtnDisabled]}
        onPress={onCopyConversation}
        disabled={!canCopyConversation}
        accessibilityLabel="Copy conversation"
        accessibilityState={{ disabled: !canCopyConversation }}>
        <Text
          style={[
            styles.copyIcon,
            !canCopyConversation && styles.copyIconDisabled,
          ]}>
          ⧉
        </Text>
      </Pressable>

      <Pressable
        style={styles.iconBtn}
        onPress={onSettingsPress}
        accessibilityLabel="Settings">
        <Text style={styles.icon}>⚙</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    gap: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    color: colors.text,
    fontSize: 18,
  },
  iconBtnDisabled: {
    opacity: 0.35,
  },
  copyIcon: {
    color: colors.accent,
    fontSize: 17,
    fontWeight: '600',
  },
  copyIconDisabled: {
    color: colors.textMuted,
  },
  center: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  modelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '58%',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modelText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
  },
  chevron: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: '700',
  },
  syncChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  syncText: {
    fontSize: 10,
    fontWeight: '500',
  },
});
