import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import type { ComponentProps } from 'react';
import { Button } from 'react-native-paper';

import { layout, radius, spacing, useAppTheme } from '@/theme';

type IconSource = ComponentProps<typeof Button>['icon'];

export type CtaVariant =
  /** The one primary action on a light section. */
  | 'primary'
  /** Primary action sitting on a filled primary band (inverted colours). */
  | 'onPrimary'
  /** Low-emphasis secondary action. */
  | 'text';

type CtaButtonProps = {
  label: string;
  onPress: () => void;
  variant?: CtaVariant;
  icon?: IconSource;
  /** Place the icon after the label (used for the "scroll down" affordance). */
  iconTrailing?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Single definition of what a call to action looks like on this landing page:
 * pill shape, >= 44pt tall hit area, consistent label sizing. Every section
 * uses this rather than styling `Button` ad hoc, so the CTAs cannot drift.
 */
export function CtaButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  iconTrailing = false,
  accessibilityLabel,
  accessibilityHint,
  style,
}: CtaButtonProps) {
  const theme = useAppTheme();

  const mode = variant === 'text' ? 'text' : 'contained';
  const buttonColor = variant === 'onPrimary' ? theme.colors.surface : undefined;
  const textColor =
    variant === 'onPrimary'
      ? theme.colors.primary
      : variant === 'text'
        ? theme.colors.primary
        : undefined;

  return (
    <Button
      mode={mode}
      icon={icon}
      onPress={onPress}
      buttonColor={buttonColor}
      textColor={textColor}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      style={[styles.button, style]}
      contentStyle={[
        styles.content,
        variant === 'text' && styles.textContent,
        iconTrailing && styles.trailingIcon,
      ]}
      labelStyle={styles.label}
    >
      {label}
    </Button>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.pill,
  },
  content: {
    height: 52,
    paddingHorizontal: spacing.lg,
  },
  textContent: {
    height: layout.minTouchTarget,
    paddingHorizontal: spacing.sm,
  },
  trailingIcon: {
    flexDirection: 'row-reverse',
  },
  label: {
    fontSize: 16,
    lineHeight: 22,
    marginVertical: 0,
    marginHorizontal: spacing.xs,
  },
});
