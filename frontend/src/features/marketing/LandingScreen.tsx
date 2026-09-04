import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/AuthContext';
import { useAppTheme } from '@/theme';

import { BottomCtaSection } from './components/BottomCtaSection';
import { HeroSection } from './components/HeroSection';
import { HowItWorksSection } from './components/HowItWorksSection';
import { LandingFooter } from './components/LandingFooter';
import { LandingTopBar } from './components/LandingTopBar';
import { SeeItInActionSection } from './components/SeeItInActionSection';

/**
 * Public marketing landing page ("Problem to Preview"): top bar, hero, three
 * steps, dashboard preview, closing CTA band, footer.
 *
 * Sign-up does not exist yet, so every "Get started" affordance routes through
 * one handler that acknowledges the tap with a Snackbar rather than silently
 * doing nothing - a dead primary button is worse than an honest "not built
 * yet". Swap `handleGetStarted` for the real sign-up route once it exists.
 * "Log in", by contrast, does have a destination: it navigates to `/login`.
 *
 * Once a session is authenticated the top bar shows the signed-in identity and
 * a "Log out" action in place of "Log in" / "Get started".
 */
export function LandingScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { status, user, signOut } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const howItWorksY = useRef(0);
  const headerHeight = useRef(0);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const handleGetStarted = useCallback(() => {
    setSnackbarVisible(true);
  }, []);

  const handleLogIn = useCallback(() => {
    router.push('/login');
  }, [router]);

  const account =
    status === 'authenticated' && user
      ? { label: user.display_name ?? user.email, onLogOut: () => void signOut() }
      : undefined;

  const handleHeaderLayout = useCallback((event: LayoutChangeEvent) => {
    headerHeight.current = event.nativeEvent.layout.height;
  }, []);

  const handleHowItWorksLayout = useCallback((event: LayoutChangeEvent) => {
    howItWorksY.current = event.nativeEvent.layout.y;
  }, []);

  const handleSeeHowItWorks = useCallback(() => {
    scrollRef.current?.scrollTo({
      // Offset by the sticky header so the section heading is not hidden under it.
      y: Math.max(howItWorksY.current - headerHeight.current, 0),
      animated: true,
    });
  }, []);

  return (
    // The root is white so short viewports (and iOS overscroll) reveal the same
    // colour as the sticky top bar and the footer rather than a stray band.
    <View style={[styles.root, { backgroundColor: theme.colors.surface }]}>
      <ScrollView
        ref={scrollRef}
        stickyHeaderIndices={[0]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ backgroundColor: theme.colors.background }}
      >
        <View onLayout={handleHeaderLayout}>
          <LandingTopBar
            onGetStarted={handleGetStarted}
            onLogIn={handleLogIn}
            account={account}
          />
        </View>

        <HeroSection
          onGetStarted={handleGetStarted}
          onSeeHowItWorks={handleSeeHowItWorks}
        />
        <HowItWorksSection onLayout={handleHowItWorksLayout} />
        <SeeItInActionSection onGetStarted={handleGetStarted} />
        <BottomCtaSection onGetStarted={handleGetStarted} />
        <LandingFooter />
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
        action={{ label: 'OK', onPress: () => setSnackbarVisible(false) }}
        style={styles.snackbar}
        // Keep it clear of the iOS home indicator / Android gesture bar.
        wrapperStyle={{ bottom: insets.bottom }}
      >
        Sign-up isn&apos;t wired up yet — this is a preview of the landing page.
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  snackbar: {
    alignSelf: 'center',
    maxWidth: 520,
  },
});
