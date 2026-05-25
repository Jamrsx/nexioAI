import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export function SettingsGroup({ children, style }: Props) {
  return <View style={[styles.group, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  group: {
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
});
