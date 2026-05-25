/**
 * NexioAI Mobile — Chunk 3 shell (dark mode, placeholder logo)
 *
 * @format
 */

import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { colors } from './src/theme/colors';

function App() {
  console.log('[NexioAI] App mounted');

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.root}>
          <AppNavigator />
        </View>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default App;
