import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

type LogoPlaceholderProps = {
  size?: 'small' | 'medium' | 'large';
  showTitle?: boolean;
};

const sizes = {
  small: 56,
  medium: 88,
  large: 120,
};

/**
 * Brand logo — replace mo/src/assets/logo.png when you update the asset.
 */
export function LogoPlaceholder({
  size = 'medium',
  showTitle = false,
}: LogoPlaceholderProps) {
  const dim = sizes[size];

  return (
    <View style={styles.wrap} accessibilityLabel="NexioAI logo">
      <Image
        source={require('../assets/logo.png')}
        style={{ width: dim, height: dim, borderRadius: dim / 2 }}
        resizeMode="contain"
      />
      {showTitle ? <Text style={styles.title}>NexioAI</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  title: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 20,
    marginTop: 12,
  },
});
