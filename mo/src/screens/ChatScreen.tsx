import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChatComposer } from '../components/chat/ChatComposer';
import { ChatHeader } from '../components/chat/ChatHeader';
import { ChatMessageList } from '../components/chat/ChatMessageList';
import { ChatModelPickerModal } from '../components/chat/ChatModelPickerModal';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { useChat } from '../context/ChatContext';
import { ToastProvider, useToast } from '../context/ToastContext';
import { useSync } from '../context/SyncContext';
import {
  COMPOSER_DOCK_HEIGHT,
  getComposerBottomOffset,
} from '../hooks/useKeyboardHeight';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import type { MainStackParamList } from '../navigation/AppNavigator';
import { getActiveModel } from '../services/modelStorage';
import { colors } from '../theme/colors';
import { formatConversationForCopy } from '../utils/chatCopyFormat';
import { copyTextToClipboard } from '../utils/chatClipboard';
import { buildContextUsage } from '../utils/tokenEstimate';
import { MODEL_CONTEXT_SIZE } from '../config/modelCatalog';

type Props = NativeStackScreenProps<MainStackParamList, 'Chat'>;

const SIDEBAR_WIDTH = Math.min(300, Dimensions.get('window').width * 0.82);

export function ChatScreen(props: Props) {
  return (
    <ToastProvider>
      <ChatScreenContent {...props} />
    </ToastProvider>
  );
}

function ChatScreenContent({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [activeModelLabel, setActiveModelLabel] = useState<string | null>(null);
  const [contextTokenLimit, setContextTokenLimit] = useState(MODEL_CONTEXT_SIZE);
  const [composerDraft, setComposerDraft] = useState('');
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const {
    conversations,
    activeConversation,
    messages,
    isSending,
    sidebarOpen,
    setSidebarOpen,
    selectConversation,
    startNewChat,
    deleteConversation,
    sendMessage,
  } = useChat();
  const { status: syncStatus } = useSync();
  const keyboardHeight = useKeyboardHeight();

  const refreshActiveModelLabel = useCallback(() => {
    getActiveModel().then(active => {
      setActiveModelLabel(active?.entry.name ?? null);
      setContextTokenLimit(active?.entry.contextSize ?? MODEL_CONTEXT_SIZE);
      console.log('[NexioAI] Chat active model:', active?.entry.name ?? 'none');
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshActiveModelLabel();
    }, [refreshActiveModelLabel]),
  );

  const visibleMessages = messages.filter(m => m.role !== 'system');
  const canCopyConversation = visibleMessages.length > 0;

  const contextUsage = useMemo(
    () => buildContextUsage(messages, contextTokenLimit, composerDraft),
    [messages, contextTokenLimit, composerDraft],
  );

  const handleCopyConversation = useCallback(async () => {
    const text = formatConversationForCopy(
      messages,
      activeConversation?.title ?? 'Chat',
    );
    if (!text) {
      showToast('Nothing to copy');
      return;
    }
    const ok = await copyTextToClipboard(text);
    console.log('[NexioAI] Conversation copied:', activeConversation?.id, ok);
    showToast(ok ? 'Copied' : 'Copy failed');
  }, [
    messages,
    activeConversation?.title,
    activeConversation?.id,
    showToast,
  ]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ChatHeader
        title={activeConversation?.title ?? 'Chat'}
        modelLabel={activeModelLabel}
        syncStatus={syncStatus}
        canCopyConversation={canCopyConversation}
        onCopyConversation={handleCopyConversation}
        onMenuPress={() => setSidebarOpen(!sidebarOpen)}
        onSettingsPress={() => navigation.navigate('Settings')}
        onModelPress={() => setModelPickerOpen(true)}
      />

      <View style={styles.mainArea}>
        <ChatBody
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          conversations={conversations}
          activeConversationId={activeConversation?.id ?? null}
          selectConversation={selectConversation}
          startNewChat={startNewChat}
          deleteConversation={deleteConversation}
          messages={messages}
          isSending={isSending}
          sendMessage={sendMessage}
          keyboardHeight={keyboardHeight}
          contextUsage={contextUsage}
          onDraftChange={setComposerDraft}
        />
      </View>

      <ChatModelPickerModal
        visible={modelPickerOpen}
        onClose={() => setModelPickerOpen(false)}
        onActiveModelChange={refreshActiveModelLabel}
      />
    </View>
  );
}

type ChatBodyProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  conversations: ReturnType<typeof useChat>['conversations'];
  activeConversationId: number | null;
  selectConversation: (id: number) => void;
  startNewChat: () => void;
  deleteConversation: (id: number) => void;
  messages: ReturnType<typeof useChat>['messages'];
  isSending: boolean;
  sendMessage: (text: string) => void;
  keyboardHeight: number;
  contextUsage: ReturnType<typeof buildContextUsage>;
  onDraftChange: (text: string) => void;
};

function ChatBody({
  sidebarOpen,
  setSidebarOpen,
  conversations,
  activeConversationId,
  selectConversation,
  startNewChat,
  deleteConversation,
  messages,
  isSending,
  sendMessage,
  keyboardHeight,
  contextUsage,
  onDraftChange,
}: ChatBodyProps) {
  const insets = useSafeAreaInsets();
  const composerBottom = getComposerBottomOffset(keyboardHeight, insets.bottom);
  const listBottomInset =
    keyboardHeight > 0
      ? composerBottom + COMPOSER_DOCK_HEIGHT
      : COMPOSER_DOCK_HEIGHT + Math.max(insets.bottom, 8);

  return (
    <View style={styles.body}>
      {sidebarOpen && (
        <>
          <Pressable
            style={styles.backdrop}
            onPress={() => setSidebarOpen(false)}
          />
          <View style={[styles.sidebar, { width: SIDEBAR_WIDTH }]}>
            <ChatSidebar
              conversations={conversations}
              activeId={activeConversationId}
              onSelect={selectConversation}
              onNewChat={startNewChat}
              onDelete={deleteConversation}
            />
          </View>
        </>
      )}

      <View style={styles.chatPane}>
        <ChatMessageList
          messages={messages}
          isSending={isSending}
          bottomInset={listBottomInset}
        />
        <View style={[styles.composerDock, { bottom: composerBottom }]}>
          <ChatComposer
            onSend={sendMessage}
            disabled={isSending}
            contextUsage={contextUsage}
            onDraftChange={onDraftChange}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mainArea: {
    flex: 1,
    minHeight: 0,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 2,
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 3,
    elevation: 8,
  },
  chatPane: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
  composerDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 16,
  },
});
