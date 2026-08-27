import { Platform } from 'react-native';
import type { TextProps } from 'react-native';

/**
 * Marks a `Text` as a heading.
 *
 * On native this is just `accessibilityRole="header"`. On web,
 * react-native-web maps the header role to `<h1>` by default, which would give
 * the page four `<h1>`s; passing `aria-level` makes it emit `<h2>`/`<h3>`
 * instead so the document outline is correct. `aria-level` is not in React
 * Native's own prop types, hence the cast.
 */
export function heading(level: 1 | 2 | 3 | 4 | 5 | 6): Partial<TextProps> {
  const base: Partial<TextProps> = { accessibilityRole: 'header' };

  if (Platform.OS !== 'web') {
    return base;
  }

  return { ...base, 'aria-level': level } as unknown as Partial<TextProps>;
}
