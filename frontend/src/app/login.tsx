import { Stack } from 'expo-router';

import { LoginScreen } from '@/features/auth/LoginScreen';

export default function Login() {
  return (
    <>
      <Stack.Screen options={{ title: 'Log in' }} />
      <LoginScreen />
    </>
  );
}
