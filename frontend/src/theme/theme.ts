import { MD3LightTheme, useTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

import { appFontConfig } from './fonts';
import { palette } from './tokens';

/**
 * Paper theme extended with the handful of brand colours MD3 has no slot for.
 * Consume it with `useAppTheme()` so `theme.colors.accent` etc. stay typed.
 */
export type AppTheme = MD3Theme & {
  colors: MD3Theme['colors'] & {
    /** Raw splash-screen blue. Decorative fills only - never behind text. */
    primaryBright: string;
    /** Tinted surface for inset panels inside a card. */
    surfaceMuted: string;
    /** Urgency accent, e.g. "due in 2d" badges. */
    accent: string;
    accentContainer: string;
  };
};

export const appTheme: AppTheme = {
  ...MD3LightTheme,
  roundness: 3, // Paper multiplies this by 4 -> 12pt corners
  fonts: appFontConfig,
  colors: {
    ...MD3LightTheme.colors,

    primary: palette.primary,
    onPrimary: palette.onPrimary,
    primaryContainer: palette.primaryContainer,
    onPrimaryContainer: palette.onPrimaryContainer,

    secondary: palette.onPrimaryContainer,
    onSecondary: palette.onPrimary,
    secondaryContainer: palette.primaryContainer,
    onSecondaryContainer: palette.onPrimaryContainer,

    tertiary: palette.accent,
    onTertiary: palette.onPrimary,
    tertiaryContainer: palette.accentContainer,
    onTertiaryContainer: palette.accent,

    background: palette.background,
    onBackground: palette.onSurface,
    surface: palette.surface,
    onSurface: palette.onSurface,
    surfaceVariant: palette.surfaceMuted,
    onSurfaceVariant: palette.onSurfaceVariant,

    outline: palette.outline,
    outlineVariant: palette.outline,

    inverseSurface: palette.onSurface,
    inverseOnSurface: palette.background,
    inversePrimary: palette.primaryContainer,

    // Cards/Surfaces stay white at every elevation instead of drifting purple.
    elevation: {
      level0: 'transparent',
      level1: palette.surface,
      level2: palette.surface,
      level3: palette.surface,
      level4: palette.surface,
      level5: palette.surface,
    },

    primaryBright: palette.primaryBright,
    surfaceMuted: palette.surfaceMuted,
    accent: palette.accent,
    accentContainer: palette.accentContainer,
  },
};

export const useAppTheme = () => useTheme<AppTheme>();
