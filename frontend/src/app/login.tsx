import { useCallback } from 'react';
import { Stack, useRouter } from 'expo-router';

import { login } from '@/features/auth/api';
import { LoginScreen, type LoginCredentials } from '@/features/auth/LoginScreen';
import { storeTokenPair } from '@/features/auth/tokenStorage';

export default function Login() {
  const router = useRouter();

  const handleSubmit = useCallback(
    async (credentials: LoginCredentials) => {
      const tokens = await login(credentials);
      await storeTokenPair(tokens);
      // No authenticated area exists yet — land back on the marketing home.
      router.replace('/');
    },
    [router],
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Log in' }} />
      <LoginScreen onSubmit={handleSubmit} />
    </>
  );
}
