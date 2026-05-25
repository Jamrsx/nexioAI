import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppTextInput } from '../components/AppTextInput';
import { LogoPlaceholder } from '../components/LogoPlaceholder';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import type { AuthStackParamList } from '../navigation/AppNavigator';
import { isAuthApiError, pingHealth } from '../services/authApi';
import { getApiBaseUrl } from '../config/api';
import { getAuthFailureAlert } from '../utils/authAlert';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleRegister = async () => {
    setErrors({});
    setLoading(true);
    try {
      const healthy = await pingHealth();
      console.log('[NexioAI] API health:', healthy, getApiBaseUrl());
      if (!healthy) {
        Alert.alert(
          'Connection error',
          `Cannot reach ${getApiBaseUrl()}/api/health.\n\nCheck Laragon, firewall, and api.local.ts IP.`,
        );
        return;
      }

      console.log('[NexioAI] Register attempt:', email);
      await register(
        name.trim(),
        email.trim(),
        password,
        passwordConfirmation,
      );
    } catch (err) {
      console.error('[NexioAI] Register error:', err);

      if (isAuthApiError(err) && err.fieldErrors) {
        const next: Record<string, string> = {};
        for (const [key, messages] of Object.entries(err.fieldErrors)) {
          next[key] = messages[0];
        }
        setErrors(next);
      } else {
        const { title, message } = getAuthFailureAlert(err, 'register');
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
        <Text style={styles.title}>Create account</Text>

        <AppTextInput
          label="Name"
          value={name}
          onChangeText={setName}
          autoComplete="name"
          error={errors.name}
        />
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
          error={errors.password}
        />
        <AppTextInput
          label="Confirm password"
          value={passwordConfirmation}
          onChangeText={setPasswordConfirmation}
          secureTextEntry
          error={errors.password_confirmation}
        />

        <PrimaryButton
          title="Register"
          onPress={handleRegister}
          loading={loading}
        />

        <PrimaryButton
          title="Back to sign in"
          variant="secondary"
          onPress={() => navigation.goBack()}
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
    paddingTop: 16,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  mt: { marginTop: 12 },
});
