import React from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChatComposer } from '../components/chat/ChatComposer';
import { ChatMessageList } from '../components/chat/ChatMessageList';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { useChat } from '../context/ChatContext';
import type { MainStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<MainStackParamList, 'Chat'>;

const SIDEBAR_WIDTH = Math.min(300, Dimensions.get('window').width * 0.82);

export function ChatScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const {
    conversations,
    activeConversation,
    messages,
    isSending,
    sidebarOpen,
    setSidebarOpen,
    selectConversation,
    startNewChat,
    sendMessage,
  } = useChat();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => setSidebarOpen(!sidebarOpen)}
          accessibilityLabel="Toggle chat history">
          <Text style={styles.iconText}>☰</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {activeConversation?.title ?? 'NexioAI'}
        </Text>
        <Pressable
          style={styles.iconBtn}
          onPress={() => navigation.navigate('Settings')}
          accessibilityLabel="Settings">
          <Text style={styles.iconText}>⚙</Text>
        </Pressable>
      </View>

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
                activeId={activeConversation?.id ?? null}
                onSelect={selectConversation}
                onNewChat={startNewChat}
              />
            </View>
          </>
        )}

        <View style={styles.main}>
          <ChatMessageList messages={messages} isSending={isSending} />
          <ChatComposer onSend={sendMessage} disabled={isSending} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: colors.text,
    fontSize: 20,
  },
  headerTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 4,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
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
  main: {
    flex: 1,
  },
});
