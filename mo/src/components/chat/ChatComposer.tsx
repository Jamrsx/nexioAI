import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { PrimaryButton } from '../PrimaryButton';
import { colors } from '../../theme/colors';

type Props = {
  onSend: (text: string) => void;
  disabled?: boolean;
};

export function ChatComposer({ onSend, disabled }: Props) {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) {
      return;
    }

    onSend(trimmed);
    setText('');
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Message NexioAI…"
        placeholderTextColor={colors.textMuted}
        value={text}
        onChangeText={setText}
        editable={!disabled}
        multiline
        maxLength={4000}
      />
      <PrimaryButton
        title="Send"
        onPress={handleSend}
        loading={disabled}
        style={styles.sendBtn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 8,
  },
  input: {
    minHeight: 44,
    maxHeight: 120,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    width: '100%',
  },
});
