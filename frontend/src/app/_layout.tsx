import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { appFonts, appTheme, useWebFocusRing } from '@/theme';

// Hold the native splash screen until the display face is ready, so headlines
// never flash in the fallback system font first.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(appFonts);

  useWebFocusRing(appTheme.colors.primary);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // `fontError` still lets the app through - headlines fall back to the system
  // face rather than the app hanging on a splash screen forever.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={appTheme}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: appTheme.colors.background },
          }}
        />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
