import type { ReactNode } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, useResponsive } from '@/theme';

type SectionProps = {
  children: ReactNode;
  /** Full-bleed band colour. Defaults to transparent (page background). */
  background?: string;
  /** Multiplier applied to the responsive vertical rhythm. */
  density?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  onLayout?: (event: LayoutChangeEvent) => void;
};

/**
 * A full-bleed horizontal band whose inner content is centred and capped at
 * `layout.maxContentWidth`, with the responsive page gutter and vertical
 * rhythm applied. Every landing section goes through this so padding never
 * drifts between sections.
 */
export function Section({
  children,
  background,
  density = 1,
  style,
  contentStyle,
  onLayout,
}: SectionProps) {
  const { gutter, sectionSpacing } = useResponsive();
  // Landscape notches on iOS eat into the gutter; keep bands full-bleed and
  // push the *content* clear of the inset instead.
  const insets = useSafeAreaInsets();

  return (
    <View
      onLayout={onLayout}
      style={[
        {
          width: '100%',
          backgroundColor: background ?? 'transparent',
          paddingLeft: gutter + insets.left,
          paddingRight: gutter + insets.right,
          paddingVertical: Math.round(sectionSpacing * density),
        },
        style,
      ]}
    >
      <View
        style={[
          {
            width: '100%',
            maxWidth: layout.maxContentWidth,
            alignSelf: 'center',
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}
