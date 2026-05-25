import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  formatTokenCount,
  getContextPressure,
  type ContextUsage,
} from '../../utils/tokenEstimate';
import { colors } from '../../theme/colors';

type Props = {
  usage: ContextUsage;
};

const PRESSURE_COLOR: Record<
  ReturnType<typeof getContextPressure>,
  string
> = {
  ok: colors.accent,
  warm: '#38bdf8',
  high: '#f59e0b',
  critical: colors.danger,
};

/** Cursor-style ring: fill grows clockwise as context fills up. */
function ContextRing({ ratio, color }: { ratio: number; color: string }) {
  const clamped = Math.min(1, Math.max(0, ratio));

  return (
    <View
      style={[
        styles.ring,
        {
          borderColor: colors.border,
          borderTopColor: clamped > 0.125 ? color : colors.border,
          borderRightColor: clamped > 0.375 ? color : colors.border,
          borderBottomColor: clamped > 0.625 ? color : colors.border,
          borderLeftColor: clamped > 0.875 ? color : colors.border,
        },
      ]}
    />
  );
}

export function ContextWindowIndicator({ usage }: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const pressure = getContextPressure(usage);
  const color = PRESSURE_COLOR[pressure];
  const ctxRatio = usage.promptTokens / Math.max(1, usage.contextLimit);
  const ctxRemaining = Math.max(0, usage.contextLimit - usage.promptTokens);

  return (
    <>
      <Pressable
        style={styles.hit}
        onPress={() => setDetailsOpen(true)}
        accessibilityLabel="Context usage"
        accessibilityHint="Shows tokens used in this chat">
        <ContextRing ratio={ctxRatio} color={color} />
      </Pressable>

      <Modal
        visible={detailsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailsOpen(false)}>
        <Pressable
          style={styles.backdrop}
          onPress={() => setDetailsOpen(false)}>
          <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Context</Text>

            <View style={styles.row}>
              <Text style={styles.label}>Next message (speed)</Text>
              <Text style={styles.value}>
                {formatTokenCount(usage.promptTokens)} /{' '}
                {formatTokenCount(usage.contextLimit)}
              </Text>
            </View>
            <Text style={styles.hint}>
              ~{formatTokenCount(ctxRemaining)} left before replies may slow on
              this device.
            </Text>

            <View style={[styles.row, styles.rowGap]}>
              <Text style={styles.label}>Conversation total</Text>
              <Text style={styles.value}>
                {formatTokenCount(usage.conversationTokens)} /{' '}
                {formatTokenCount(usage.conversationBudget)}
              </Text>
            </View>
            <Text style={styles.hint}>
              Stored history budget (sync/training). On-phone model window is{' '}
              {formatTokenCount(usage.contextLimit)} per reply.
            </Text>

            {pressure === 'critical' && (
              <Text style={styles.warn}>
                Context is nearly full. Start a new chat for faster, clearer
                replies.
              </Text>
            )}

            <Pressable
              style={styles.closeBtn}
              onPress={() => setDetailsOpen(false)}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: 28,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  rowGap: {
    marginTop: 14,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    flex: 1,
  },
  value: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  warn: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 12,
  },
  closeBtn: {
    marginTop: 16,
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  closeText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
});
