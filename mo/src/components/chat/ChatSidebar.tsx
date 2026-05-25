import React from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { LocalConversation } from '../../types/chat';
import { colors } from '../../theme/colors';

type Props = {
  conversations: LocalConversation[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onNewChat: () => void;
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
}: Props) {
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

          return (
            <Pressable
              style={[styles.item, active && styles.itemActive]}
              onPress={() => onSelect(item.id)}>
              <Text style={styles.itemTitle} numberOfLines={1}>
                {item.title ?? 'New chat'}
              </Text>
              <View style={styles.itemMeta}>
                <Text style={styles.itemTime}>{formatWhen(item.updated_at)}</Text>
                {item.sync_status === 'pending' && (
                  <Text style={styles.pendingBadge}>pending</Text>
                )}
              </View>
            </Pressable>
          );
        }}
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
  item: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 8,
  },
  itemActive: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.primary,
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
  empty: {
    color: colors.textMuted,
    fontSize: 13,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});
