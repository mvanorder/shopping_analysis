import { StyleSheet, View } from 'react-native';
import { Button, Surface } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, radius, spacing, useAppTheme, useResponsive } from '@/theme';

import { BrandMark } from './BrandMark';

type LandingTopBarProps = {
  onGetStarted: () => void;
};

/**
 * Sticky marketing header: brand lockup left, single primary action right.
 * Deliberately not a Paper `Appbar.Header` - this is a public web-style
 * landing page, not an in-app screen with a back affordance, and an Appbar
 * would imply navigation chrome that does not exist here.
 */
export function LandingTopBar({ onGetStarted }: LandingTopBarProps) {
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
          paddingLeft: Math.max(gutter, insets.left),
          paddingRight: Math.max(gutter, insets.right),
        },
      ]}
    >
      <View style={styles.inner}>
        <BrandMark />
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
  cta: {
    borderRadius: radius.pill,
  },
  ctaContent: {
    height: layout.minTouchTarget,
    paddingHorizontal: spacing.md,
  },
  ctaLabel: {
    marginHorizontal: spacing.xs,
  },
});
