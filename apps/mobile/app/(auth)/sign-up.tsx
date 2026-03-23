import { useState } from 'react';
import { View, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Link } from 'expo-router';
import { useAuthStore } from '../../shared/stores/authStore';
import { Typography } from '../../shared/components/Typography';
import { Input } from '../../shared/components/Input';
import { Button } from '../../shared/components/Button';

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { signUp, isLoading, error, clearError } = useAuthStore();

  async function handleSignUp() {
    if (!name.trim() || !email.trim() || !password) return;
    clearError();
    try {
      await signUp(name.trim(), email.trim(), password);
    } catch {
      return;
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-1 justify-center px-6">
        <Typography variant="hero" className="mb-2">
          Create account
        </Typography>
        <Typography variant="bodySecondary" className="mb-8">
          Create an account for the auth template
        </Typography>

        {error ? (
          <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            <Typography variant="bodySecondary" className="text-red-700">
              {error}
            </Typography>
          </View>
        ) : null}

        <View className="mb-4">
          <Input
            label="Name"
            placeholder="Your name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
          />
        </View>

        <View className="mb-4">
          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            returnKeyType="next"
          />
        </View>

        <View className="mb-6">
          <Input
            label="Password"
            placeholder="At least 8 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleSignUp}
          />
        </View>

        <Button
          onPress={handleSignUp}
          loading={isLoading}
          disabled={!name.trim() || !email.trim() || !password}
          label="Create account"
          fullWidth
        />

        <View className="flex-row justify-center mt-6">
          <Typography variant="body" className="text-gray-500">
            Already have an account?{' '}
          </Typography>
          <Link href="/(auth)/sign-in" asChild>
            <TouchableOpacity>
              <Typography variant="link">Sign in</Typography>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
