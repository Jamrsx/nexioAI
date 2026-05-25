import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { colors } from '../theme/colors';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainStackParamList = {
  Home: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: colors.background },
      }}>
      <AuthStack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: 'Sign in', headerShown: false }}
      />
      <AuthStack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: 'Register', headerBackTitle: 'Back' }}
      />
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <MainStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: colors.background },
      }}>
      <MainStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'NexioAI' }}
      />
    </MainStack.Navigator>
  );
}

function LoadingGate() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function AppNavigator() {
  const { isLoading, isAuthenticated } = useAuth();

  return (
    <NavigationContainer theme={navTheme}>
      {isLoading ? (
        <LoadingGate />
      ) : isAuthenticated ? (
        <MainNavigator />
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
