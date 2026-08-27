import { StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, useAppTheme } from '@/theme';

import { Section } from './Section';

export function LandingFooter() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <Section
      background={theme.colors.surface}
      density={0.5}
      style={{ paddingBottom: spacing.lg + insets.bottom }}
      contentStyle={styles.content}
    >
      <Text
        variant="bodySmall"
        style={[styles.text, { color: theme.colors.onSurfaceVariant }]}
      >
        Shopping Analysis — a personal project for understanding your own shopping
        habits.
      </Text>
      <Text
        variant="bodySmall"
        style={[styles.text, styles.copyright, { color: theme.colors.onSurfaceVariant }]}
      >
        © 2026 Malcolm VanOrder
      </Text>
    </Section>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
  },
  text: {
    textAlign: 'center',
    maxWidth: 520,
  },
  copyright: {
    marginTop: spacing.xxs,
  },
});
