import React, { useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { LocalMessage } from '../../types/chat';
import { useToast } from '../../context/ToastContext';
import { formatMessageForCopy } from '../../utils/chatCopyFormat';
import { copyTextToClipboard } from '../../utils/chatClipboard';
import { colors } from '../../theme/colors';

type Props = {
  messages: LocalMessage[];
  isSending: boolean;
  /** Space reserved above the docked composer (keyboard + bar). */
  bottomInset?: number;
};

export function ChatMessageList({
  messages,
  isSending,
  bottomInset = 0,
}: Props) {
  const listRef = useRef<FlatList<LocalMessage>>(null);
  const { showToast } = useToast();

  const handleCopyMessage = useCallback(
    async (message: LocalMessage) => {
      const text = formatMessageForCopy(message);
      const ok = await copyTextToClipboard(text);
      console.log('[NexioAI] Message copied:', message.id, ok);
      showToast(ok ? 'Copied' : 'Copy failed');
    },
    [showToast],
  );

  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length, isSending, bottomInset]);

  return (
    <FlatList
      ref={listRef}
      data={messages}
      keyExtractor={item => String(item.id)}
      style={styles.listFlex}
      contentContainerStyle={[
        styles.list,
        bottomInset > 0 && { paddingBottom: bottomInset },
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Start a message</Text>
          <Text style={styles.emptyBody}>
            Replies run on your phone. Long-press a message to copy it, or use
            Copy in the header for the full chat.
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const isUser = item.role === 'user';

        return (
          <Pressable
            onLongPress={() => handleCopyMessage(item)}
            delayLongPress={400}
            style={({ pressed }) => [
              styles.bubble,
              isUser ? styles.userBubble : styles.assistantBubble,
              pressed && styles.bubblePressed,
            ]}
            accessibilityLabel={`Copy ${isUser ? 'your' : 'assistant'} message`}
            accessibilityHint="Long press to copy">
            <Text
              selectable
              style={[
                styles.content,
                isUser ? styles.userContent : styles.assistantContent,
              ]}>
              {item.content}
            </Text>
          </Pressable>
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
  listFlex: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    flexGrow: 1,
  },
  emptyWrap: {
    paddingTop: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    textAlign: 'center',
  },
  bubble: {
    maxWidth: '84%',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubblePressed: {
    opacity: 0.85,
  },
  content: {
    fontSize: 15,
    lineHeight: 21,
  },
  userContent: {
    color: colors.text,
  },
  assistantContent: {
    color: colors.text,
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
