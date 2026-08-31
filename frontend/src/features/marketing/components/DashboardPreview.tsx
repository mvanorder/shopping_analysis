import { StyleSheet, View } from 'react-native';
import { Divider, Icon, Surface, Text } from 'react-native-paper';

import { radius, spacing, useAppTheme } from '@/theme';

type Stat = { label: string; value: string };
type PreviewItem = {
  icon: string;
  name: string;
  /** Short badge copy, e.g. "2d". */
  due: string;
  /** Spoken form of the badge for assistive tech. */
  dueSpoken: string;
};

const STATS: Stat[] = [
  { label: 'Spend', value: '$342' },
  { label: 'Orders', value: '9' },
  { label: 'Next', value: '$365' },
];

const ITEMS: PreviewItem[] = [
  { icon: 'bottle-soda-outline', name: 'Milk', due: '2d', dueSpoken: 'due in 2 days' },
  { icon: 'coffee-outline', name: 'Coffee', due: '4d', dueSpoken: 'due in 4 days' },
  {
    icon: 'paper-roll-outline',
    name: 'Paper Towels',
    due: '5d',
    dueSpoken: 'due in 5 days',
  },
];

type DashboardPreviewProps = {
  /** Corner rounding - squared off a little when nested inside a phone frame. */
  rounded?: boolean;
  /** Drop the card shadow when the phone frame already provides depth. */
  elevated?: boolean;
  /** Extra header padding to clear a device notch, when framed. */
  topInset?: number;
};

/**
 * Condensed, non-interactive stand-in for the signed-in home screen. Content is
 * illustrative sample data, which the caption under it states plainly rather
 * than implying the visitor is looking at real numbers.
 */
export function DashboardPreview({
  rounded = true,
  elevated = true,
  topInset = 0,
}: DashboardPreviewProps) {
  const theme = useAppTheme();

  return (
    <Surface
      elevation={elevated ? 2 : 0}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: rounded ? radius.xl : 0,
        },
      ]}
    >
      {/* Clipping lives on an inner View, not the Surface: `overflow: hidden`
          on a Surface swallows its own shadow (Paper warns about this). */}
      <View style={[styles.clip, { borderRadius: rounded ? radius.xl : 0 }]}>
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.colors.primary,
              paddingTop: spacing.md + topInset,
            },
          ]}
        >
          <Text variant="titleMedium" style={{ color: theme.colors.onPrimary }}>
            Good afternoon
          </Text>
        </View>

        <View style={styles.body}>
          <View style={styles.stats}>
            {STATS.map((stat) => (
              <View
                key={stat.label}
                accessible
                accessibilityLabel={`${stat.label}: ${stat.value}`}
                style={[
                  styles.stat,
                  {
                    backgroundColor: theme.colors.surfaceMuted,
                    borderColor: theme.colors.outline,
                  },
                ]}
              >
                <Text
                  variant="labelSmall"
                  style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}
                >
                  {stat.label}
                </Text>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                  {stat.value}
                </Text>
              </View>
            ))}
          </View>

          <Divider style={[styles.divider, { backgroundColor: theme.colors.outline }]} />

          <View style={styles.items}>
            {ITEMS.map((item) => (
              <View
                key={item.name}
                accessible
                accessibilityLabel={`${item.name}, ${item.dueSpoken}`}
                style={styles.item}
              >
                <View
                  style={[
                    styles.itemIcon,
                    { backgroundColor: theme.colors.primaryContainer },
                  ]}
                >
                  <Icon source={item.icon} size={18} color={theme.colors.primary} />
                </View>
                <Text
                  variant="bodyMedium"
                  numberOfLines={1}
                  style={[styles.itemName, { color: theme.colors.onSurface }]}
                >
                  {item.name}
                </Text>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: theme.colors.accentContainer },
                  ]}
                >
                  <Text
                    variant="labelSmall"
                    style={[styles.badgeText, { color: theme.colors.accent }]}
                  >
                    {item.due}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  clip: {
    width: '100%',
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  body: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  stat: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    gap: 2,
  },
  statLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  divider: {
    marginVertical: spacing.xxs,
  },
  items: {
    gap: spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 36,
  },
  itemIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    flex: 1,
    minWidth: 0,
  },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  badgeText: {
    letterSpacing: 0.2,
  },
});
