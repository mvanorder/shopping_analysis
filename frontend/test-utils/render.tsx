import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { lightTheme } from '@/theme/theme';
import { ThemePreferenceProvider } from '@/theme/ThemePreference';

function AllProviders({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider>
      <ThemePreferenceProvider>
        <PaperProvider theme={lightTheme}>{children}</PaperProvider>
      </ThemePreferenceProvider>
    </SafeAreaProvider>
  );
}

/**
 * `render` with every provider the marketing screen and theme hooks expect
 * (safe-area frame, theme preference, Paper theme). Use in place of RNTL's
 * bare `render` for anything that reads the theme or the safe-area insets.
 *
 * This project's RNTL renders on a concurrent root, so `render` resolves a
 * promise — always `await` this.
 */
export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react-native';
