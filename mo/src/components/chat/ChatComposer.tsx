import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { ContextUsage } from '../../utils/tokenEstimate';
import { colors } from '../../theme/colors';
import { ContextWindowIndicator } from './ContextWindowIndicator';

type Props = {
  onSend: (text: string) => void;
  disabled?: boolean;
  contextUsage?: ContextUsage;
  onDraftChange?: (text: string) => void;
};

export function ChatComposer({
  onSend,
  disabled,
  contextUsage,
  onDraftChange,
}: Props) {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) {
      return;
    }

    onSend(trimmed);
    setText('');
  };

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        {contextUsage ? (
          <ContextWindowIndicator usage={contextUsage} />
        ) : null}
        <TextInput
          style={styles.input}
          placeholder="Message…"
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={value => {
            setText(value);
            onDraftChange?.(value);
          }}
          editable={!disabled}
          multiline
          maxLength={4000}
          blurOnSubmit={false}
          contextMenuHidden={false}
          selectTextOnFocus={false}
        />
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={({ pressed }) => [
            styles.sendBtn,
            canSend && styles.sendBtnActive,
            pressed && canSend && styles.sendBtnPressed,
            !canSend && styles.sendBtnDisabled,
          ]}
          accessibilityLabel="Send message">
          {disabled ? (
            <ActivityIndicator color={colors.text} size="small" />
          ) : (
            <Text style={[styles.sendIcon, !canSend && styles.sendIconDisabled]}>
              ↑
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sendBtnPressed: {
    opacity: 0.88,
  },
  sendBtnDisabled: {
    opacity: 0.55,
  },
  sendIcon: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginTop: -2,
  },
  sendIconDisabled: {
    color: colors.textMuted,
  },
});
