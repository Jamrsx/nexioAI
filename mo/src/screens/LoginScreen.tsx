import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppTextInput } from '../components/AppTextInput';
import { LogoPlaceholder } from '../components/LogoPlaceholder';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import type { AuthStackParamList } from '../navigation/AppNavigator';
import { isAuthApiError, pingHealth } from '../services/authApi';
import { getAuthFailureAlert } from '../utils/authAlert';
import { getApiBaseUrl } from '../config/api';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleLogin = async () => {
    setErrors({});
    setLoading(true);
    try {
      const healthy = await pingHealth();
      console.log('[NexioAI] API health:', healthy, getApiBaseUrl());
      if (!healthy) {
        Alert.alert(
          'Connection error',
          `Cannot reach ${getApiBaseUrl()}/api/health.\n\nUse your PC Wi‑Fi IP in api.local.ts and run:\nphp artisan serve --host=0.0.0.0 --port=8000`,
        );
        return;
      }

      console.log('[NexioAI] Login attempt:', email);
      await login(email.trim(), password);
    } catch (err) {
      console.error('[NexioAI] Login error:', err);

      if (isAuthApiError(err) && err.fieldErrors?.email) {
        setErrors({ email: err.fieldErrors.email[0] });
      } else {
        const { title, message } = getAuthFailureAlert(err, 'login');
        Alert.alert(title, message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <LogoPlaceholder size="medium" />
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.subtitle}>API: {getApiBaseUrl()}</Text>

        <AppTextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          error={errors.email}
        />
        <AppTextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />

        <PrimaryButton title="Sign in" onPress={handleLogin} loading={loading} />

        <PrimaryButton
          title="Create account"
          variant="secondary"
          onPress={() => navigation.navigate('Register')}
          style={styles.mt}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 24,
    marginTop: 4,
  },
  mt: { marginTop: 12 },
});
