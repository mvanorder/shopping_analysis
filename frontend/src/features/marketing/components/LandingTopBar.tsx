import { StyleSheet, View } from 'react-native';
import { Button, Icon, Surface, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, radius, spacing, useAppTheme, useResponsive } from '@/theme';

import { BrandMark } from './BrandMark';
import { ThemeToggle } from './ThemeToggle';

type LandingTopBarProps = {
  onGetStarted: () => void;
  onLogIn: () => void;
  /**
   * When set, the bar shows the signed-in identity and a "Log out" action in
   * place of the "Log in" / "Get started" pair.
   */
  account?: { label: string; onLogOut: () => void };
};

/**
 * Sticky marketing header: brand lockup left, single primary action right.
 * Deliberately not a Paper `Appbar.Header` - this is a public web-style
 * landing page, not an in-app screen with a back affordance, and an Appbar
 * would imply navigation chrome that does not exist here.
 */
export function LandingTopBar({ onGetStarted, onLogIn, account }: LandingTopBarProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { gutter, isCompact } = useResponsive();

  return (
    <Surface
      elevation={0}
      style={[
        styles.bar,
        {
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.outline,
          paddingTop: insets.top + spacing.xs,
          // Same formula as Section, so the brand mark lines up with every
          // section's content edge (notch insets included, in landscape).
          paddingLeft: gutter + insets.left,
          paddingRight: gutter + insets.right,
        },
      ]}
    >
      <View style={styles.inner}>
        {/* Drop the wordmark on phones so the brand mark, theme toggle and CTA
            all fit on one row without the label wrapping. */}
        <BrandMark showWordmark={!isCompact} />
        <View style={styles.actions}>
          <ThemeToggle />
          {account ? (
            <>
              {/* The person glyph is the at-a-glance "you're signed in" cue on
                  every width; the address itself only fits alongside it once
                  the wordmark is back (non-compact). */}
              <View
                accessible
                accessibilityLabel={`Signed in as ${account.label}`}
                style={styles.account}
              >
                <Icon
                  source="account-circle"
                  size={22}
                  color={theme.colors.onSurfaceVariant}
                />
                {isCompact ? null : (
                  <Text
                    variant="bodyMedium"
                    numberOfLines={1}
                    style={[styles.accountLabel, { color: theme.colors.onSurface }]}
                  >
                    {account.label}
                  </Text>
                )}
              </View>
              <Button
                mode="text"
                onPress={account.onLogOut}
                compact
                style={styles.cta}
                contentStyle={styles.logInContent}
                labelStyle={styles.ctaLabel}
                accessibilityRole="button"
                accessibilityLabel="Log out"
              >
                Log out
              </Button>
            </>
          ) : (
            <>
              {/* Text button with a slim hit area so brand mark, toggle and both
                  actions still fit one row on the narrowest phones. */}
              <Button
                mode="text"
                onPress={onLogIn}
                compact
                style={styles.cta}
                contentStyle={styles.logInContent}
                labelStyle={styles.ctaLabel}
                accessibilityRole="button"
                accessibilityLabel="Log in to Shopping Analysis"
              >
                Log in
              </Button>
              <Button
                mode="contained"
                onPress={onGetStarted}
                compact={isCompact}
                style={styles.cta}
                contentStyle={styles.ctaContent}
                labelStyle={styles.ctaLabel}
                accessibilityRole="button"
                accessibilityLabel="Get started with Shopping Analysis"
              >
                Get started
              </Button>
            </>
          )}
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: spacing.xs,
  },
  inner: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    flexShrink: 1,
    maxWidth: 220,
  },
  accountLabel: {
    flexShrink: 1,
  },
  cta: {
    borderRadius: radius.pill,
  },
  ctaContent: {
    height: layout.minTouchTarget,
    paddingHorizontal: spacing.md,
  },
  logInContent: {
    height: layout.minTouchTarget,
    paddingHorizontal: spacing.xs,
  },
  ctaLabel: {
    marginHorizontal: spacing.xs,
  },
});
