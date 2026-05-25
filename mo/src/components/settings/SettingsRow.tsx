import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../../theme/colors';

type Props = {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
  loading?: boolean;
  disabled?: boolean;
  danger?: boolean;
  isLast?: boolean;
};

export function SettingsRow({
  title,
  subtitle,
  onPress,
  showChevron = !!onPress,
  loading = false,
  disabled = false,
  danger = false,
  isLast = false,
}: Props) {
  const isPressable = !!onPress && !disabled && !loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={!isPressable}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowBorder,
        pressed && isPressable && styles.rowPressed,
        disabled && styles.rowDisabled,
      ]}>
      <View style={styles.textBlock}>
        <Text style={[styles.title, danger && styles.titleDanger]}>{title}</Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary} size="small" />
      ) : showChevron && isPressable ? (
        <Text style={styles.chevron}>›</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    minHeight: 52,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  rowDisabled: {
    opacity: 0.5,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  titleDanger: {
    color: colors.danger,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 22,
    fontWeight: '300',
    marginTop: -2,
  },
});
