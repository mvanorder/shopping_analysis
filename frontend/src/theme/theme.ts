import { MD3DarkTheme, MD3LightTheme, useTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

import { appFontConfig } from './fonts';
import { darkPalette, palette, type Palette } from './tokens';

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

/**
 * Build an `AppTheme` by mapping our palette onto MD3's colour slots. `base` is
 * `MD3LightTheme` or `MD3DarkTheme` - it only supplies the roles we don't
 * override (scrim, error, backdrop, etc.), so the two themes stay in lockstep.
 */
function createAppTheme(base: MD3Theme, colors: Palette): AppTheme {
  return {
    ...base,
    roundness: 3, // Paper multiplies this by 4 -> 12pt corners
    fonts: appFontConfig,
    colors: {
      ...base.colors,

      primary: colors.primary,
      onPrimary: colors.onPrimary,
      primaryContainer: colors.primaryContainer,
      onPrimaryContainer: colors.onPrimaryContainer,

      secondary: colors.onPrimaryContainer,
      onSecondary: colors.onPrimary,
      secondaryContainer: colors.primaryContainer,
      onSecondaryContainer: colors.onPrimaryContainer,

      tertiary: colors.accent,
      onTertiary: colors.onPrimary,
      tertiaryContainer: colors.accentContainer,
      onTertiaryContainer: colors.accent,

      background: colors.background,
      onBackground: colors.onSurface,
      surface: colors.surface,
      onSurface: colors.onSurface,
      surfaceVariant: colors.surfaceMuted,
      onSurfaceVariant: colors.onSurfaceVariant,

      outline: colors.outline,
      outlineVariant: colors.outline,

      inverseSurface: colors.onSurface,
      inverseOnSurface: colors.background,
      inversePrimary: colors.primaryContainer,

      // Cards/Surfaces hold one flat surface colour at every elevation instead
      // of drifting purple (light) or grey-blue (dark) with Paper's tint.
      elevation: {
        level0: 'transparent',
        level1: colors.surface,
        level2: colors.surface,
        level3: colors.surface,
        level4: colors.surface,
        level5: colors.surface,
      },

      primaryBright: colors.primaryBright,
      surfaceMuted: colors.surfaceMuted,
      accent: colors.accent,
      accentContainer: colors.accentContainer,
    },
  };
}

export const lightTheme: AppTheme = createAppTheme(MD3LightTheme, palette);
export const darkTheme: AppTheme = createAppTheme(MD3DarkTheme, darkPalette);

export const useAppTheme = () => useTheme<AppTheme>();
