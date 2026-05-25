import React, { useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ConfirmModal } from '../ConfirmModal';
import type { LocalConversation } from '../../types/chat';
import { colors } from '../../theme/colors';

type Props = {
  conversations: LocalConversation[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onNewChat: () => void;
  onDelete: (id: number) => void;
};

const formatWhen = (iso: string): string => {
  try {
    const date = new Date(iso);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

export function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
}: Props) {
  const [pendingDelete, setPendingDelete] = useState<LocalConversation | null>(
    null,
  );

  const pendingTitle = pendingDelete?.title ?? 'New chat';

  const handleConfirmDelete = () => {
    if (!pendingDelete) {
      return;
    }
    console.log('[NexioAI] User confirmed delete:', pendingDelete.id);
    onDelete(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.newChatBtn} onPress={onNewChat}>
        <Text style={styles.newChatText}>+ New chat</Text>
      </Pressable>

      <Text style={styles.sectionLabel}>History</Text>

      <FlatList
        data={conversations}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No chats yet. Start a new conversation.</Text>
        }
        renderItem={({ item }) => {
          const active = item.id === activeId;
          const title = item.title ?? 'New chat';

          return (
            <View style={[styles.itemRow, active && styles.itemActive]}>
              <Pressable
                style={styles.itemMain}
                onPress={() => onSelect(item.id)}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {title}
                </Text>
                <View style={styles.itemMeta}>
                  <Text style={styles.itemTime}>{formatWhen(item.updated_at)}</Text>
                  {item.sync_status === 'pending' && (
                    <Text style={styles.pendingBadge}>pending</Text>
                  )}
                </View>
              </Pressable>
              <Pressable
                style={styles.deleteBtn}
                onPress={() => setPendingDelete(item)}
                hitSlop={8}
                accessibilityLabel={`Delete ${title}`}>
                <Text style={styles.deleteIcon}>×</Text>
              </Pressable>
            </View>
          );
        }}
      />

      <ConfirmModal
        visible={pendingDelete != null}
        title="Delete chat"
        message={`Remove "${pendingTitle}" from this device? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingTop: 8,
  },
  newChatBtn: {
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  newChatText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 15,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  list: {
    paddingBottom: 24,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginBottom: 4,
    borderRadius: 8,
  },
  itemActive: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  itemMain: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    minWidth: 0,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  itemTime: {
    color: colors.textMuted,
    fontSize: 11,
    flex: 1,
  },
  pendingBadge: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  deleteBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  deleteIcon: {
    color: colors.danger,
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 24,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 13,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});
