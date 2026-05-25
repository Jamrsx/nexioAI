import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { LocalMessage } from '../../types/chat';
import { colors } from '../../theme/colors';

type Props = {
  messages: LocalMessage[];
  isSending: boolean;
};

export function ChatMessageList({ messages, isSending }: Props) {
  const listRef = useRef<FlatList<LocalMessage>>(null);

  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length, isSending]);

  return (
    <FlatList
      ref={listRef}
      data={messages}
      keyExtractor={item => String(item.id)}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Offline chat</Text>
          <Text style={styles.emptyBody}>
            Messages are saved on this device and sync to the server when you are
            online.
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const isUser = item.role === 'user';

        return (
          <View
            style={[
              styles.bubble,
              isUser ? styles.userBubble : styles.assistantBubble,
            ]}>
            <Text style={styles.role}>{isUser ? 'You' : 'NexioAI'}</Text>
            <Text style={styles.content}>{item.content}</Text>
          </View>
        );
      }}
      ListFooterComponent={
        isSending ? (
          <View style={styles.typing}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.typingText}>Thinking…</Text>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  emptyWrap: {
    paddingTop: 48,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  emptyBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  bubble: {
    maxWidth: '88%',
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  role: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 4,
    fontWeight: '600',
  },
  content: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
  typing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  typingText: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
