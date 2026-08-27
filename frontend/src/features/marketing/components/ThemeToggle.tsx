import { StyleSheet } from 'react-native';
import { IconButton } from 'react-native-paper';

import { layout, useAppTheme, useThemePreference } from '@/theme';

/**
 * Light/dark switch for the top bar. Shows the icon of the scheme currently in
 * effect; tapping it flips to the other one and pins that choice (see
 * `useThemePreference().toggle`). Announced as a switch so assistive tech reads
 * the on/off state, not just "button".
 */
export function ThemeToggle() {
  const theme = useAppTheme();
  const { scheme, toggle } = useThemePreference();
  const isDark = scheme === 'dark';

  return (
    <IconButton
      icon={isDark ? 'weather-night' : 'weather-sunny'}
      size={22}
      onPress={toggle}
      iconColor={theme.colors.onSurfaceVariant}
      style={styles.button}
      accessibilityRole="switch"
      accessibilityState={{ checked: isDark }}
      accessibilityLabel={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    margin: 0,
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
  },
});
