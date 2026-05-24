import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

type LogoPlaceholderProps = {
  size?: 'small' | 'medium' | 'large';
};

const sizes = {
  small: { box: 48, font: 10, title: 14 },
  medium: { box: 72, font: 12, title: 18 },
  large: { box: 96, font: 14, title: 24 },
};

/**
 * Replace this component later with your real logo asset.
 */
export function LogoPlaceholder({ size = 'medium' }: LogoPlaceholderProps) {
  const dim = sizes[size];

  return (
    <View style={styles.wrap} accessibilityLabel="NexioAI logo placeholder">
      <View style={[styles.box, { width: dim.box, height: dim.box, borderRadius: dim.box / 4 }]}>
        <Text style={[styles.logoText, { fontSize: dim.font }]}>LOGO</Text>
      </View>
      <Text style={[styles.title, { fontSize: dim.title }]}>NexioAI</Text>
      <Text style={styles.subtitle}>Placeholder — swap in src/components/LogoPlaceholder.tsx</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  box: {
    backgroundColor: colors.placeholder,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: {
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    color: colors.text,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
