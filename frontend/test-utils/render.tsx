import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/features/auth/AuthContext';
import { lightTheme } from '@/theme/theme';
import { ThemePreferenceProvider } from '@/theme/ThemePreference';

function AllProviders({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider>
      <ThemePreferenceProvider>
        <AuthProvider>
          <PaperProvider theme={lightTheme}>{children}</PaperProvider>
        </AuthProvider>
      </ThemePreferenceProvider>
    </SafeAreaProvider>
  );
}

/**
 * `render` with every provider the app screens and hooks expect (safe-area
 * frame, theme preference, auth state, Paper theme). Use in place of RNTL's
 * bare `render` for anything that reads the theme, the safe-area insets, or
 * `useAuth()`. The `AuthProvider` here hydrates from the (mocked) token store,
 * so it settles to `unauthenticated`; mock `@/features/auth/AuthContext` in the
 * test to drive a signed-in state.
 *
 * This project's RNTL renders on a concurrent root, so `render` resolves a
 * promise — always `await` this.
 */
export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react-native';
