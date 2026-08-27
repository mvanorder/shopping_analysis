import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  appFonts,
  darkTheme,
  lightTheme,
  ThemePreferenceProvider,
  useThemePreference,
  useWebFocusRing,
} from '@/theme';

// Hold the native splash screen until the display face is ready, so headlines
// never flash in the fallback system font first.
SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Everything below the theme provider: picks the Paper theme from the resolved
 * scheme and matches the OS status bar to it.
 */
function ThemedApp() {
  const { scheme, isReady } = useThemePreference();
  const theme = scheme === 'dark' ? darkTheme : lightTheme;

  useWebFocusRing(theme.colors.primary);

  useEffect(() => {
    // Hold the native splash until the stored theme has been read, so a pinned
    // dark preference is never revealed as a light-to-dark flash. We don't gate
    // *rendering* on it - that would leave the static web build with a blank
    // page - only the splash dismissal.
    if (isReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isReady]);

  return (
    <PaperProvider theme={theme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      />
    </PaperProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(appFonts);

  // `fontError` still lets the app through - headlines fall back to the system
  // face rather than the app hanging on a splash screen forever.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemePreferenceProvider>
        <ThemedApp />
      </ThemePreferenceProvider>
    </SafeAreaProvider>
  );
}
