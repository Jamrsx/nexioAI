import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

export type StatusTone = 'neutral' | 'success' | 'warning' | 'error' | 'active';

const toneColor: Record<StatusTone, string> = {
  neutral: colors.textMuted,
  success: colors.success,
  warning: '#f59e0b',
  error: colors.danger,
  active: colors.primary,
};

type Props = {
  label: string;
  value: string;
  tone?: StatusTone;
  loading?: boolean;
};

export function SettingsStatusLine({
  label,
  value,
  tone = 'neutral',
  loading = false,
}: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.labelRow}>
        <View style={[styles.dot, { backgroundColor: toneColor[tone] }]} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.valueRow}>
        {loading && (
          <ActivityIndicator
            color={colors.primary}
            size="small"
            style={styles.spinner}
          />
        )}
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 16,
  },
  spinner: {
    marginRight: 8,
  },
  value: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
});
