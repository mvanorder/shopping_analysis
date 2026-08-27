import {
  Sora_400Regular,
  Sora_600SemiBold,
  Sora_700Bold,
} from '@expo-google-fonts/sora';
import { configureFonts } from 'react-native-paper';
import type { MD3Theme, MD3TypescaleKey } from 'react-native-paper';

/** Paper does not re-export `MD3Type` from its entry point; derive it. */
type MD3Type = MD3Theme['fonts'][MD3TypescaleKey];

/**
 * Font map passed to `useFonts` in the root layout.
 *
 * Sora is the *display* face: it is used only for `display*` and `headline*`
 * typescale variants, which is what marketing copy and screen titles use. Body,
 * title and label variants keep the platform system face (San Francisco on iOS,
 * Roboto on Android/web) so product UI reads as native.
 */
export const appFonts = {
  Sora_400Regular,
  Sora_600SemiBold,
  Sora_700Bold,
} as const;

export const displayFont = {
  regular: 'Sora_400Regular',
  semiBold: 'Sora_600SemiBold',
  bold: 'Sora_700Bold',
} as const;

/**
 * The custom faces are single-weight files. We deliberately leave `fontWeight`
 * at '400' and select the weight through the family name instead - setting both
 * makes Android synthesise a second layer of bold on an already-bold face.
 */
const displayVariant = (
  fontFamily: string,
  fontSize: number,
  lineHeight: number,
  letterSpacing = 0,
): MD3Type => ({
  fontFamily,
  fontWeight: '400',
  fontSize,
  lineHeight,
  letterSpacing,
});

const displayOverrides: Partial<Record<MD3TypescaleKey, Partial<MD3Type>>> = {
  displayLarge: displayVariant(displayFont.bold, 52, 60, -1),
  displayMedium: displayVariant(displayFont.bold, 42, 50, -0.8),
  displaySmall: displayVariant(displayFont.bold, 34, 42, -0.5),
  headlineLarge: displayVariant(displayFont.bold, 30, 38, -0.4),
  headlineMedium: displayVariant(displayFont.bold, 26, 34, -0.3),
  headlineSmall: displayVariant(displayFont.semiBold, 22, 30, -0.2),
};

export const appFontConfig = configureFonts({ config: displayOverrides });
