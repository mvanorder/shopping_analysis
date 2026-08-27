import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';

const FRAME_COLOR = '#0B1620';
const SCREEN_WIDTH = 300;

/**
 * Vertical room the notch occupies inside the screen. Content rendered in the
 * frame must pad its top by this much, exactly as a real app clears the status
 * bar - otherwise the bezel graphic sits on top of the first line of text.
 */
export const PHONE_FRAME_STATUS_BAR = 30;

type PhoneFrameProps = {
  children: ReactNode;
};

/**
 * Decorative device bezel. Only rendered on desktop-scale web, where a browser
 * visitor needs the visual cue that they are looking at a phone screen. On an
 * actual phone (or a phone-width browser window) the caller skips this wrapper
 * entirely and shows the preview as a plain card - a fake phone outline drawn
 * inside a real phone reads as a bug.
 *
 * Purely presentational, so it is hidden from assistive tech; the preview
 * content inside remains readable.
 */
export function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <View style={styles.outer}>
      <View style={styles.screen}>{children}</View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.notchLayer}
      >
        <View style={styles.notch} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    padding: spacing.sm,
    borderRadius: 46,
    backgroundColor: FRAME_COLOR,
    alignSelf: 'center',
    boxShadow: '0px 24px 60px rgba(11, 22, 32, 0.28)',
    elevation: 12,
  },
  screen: {
    width: SCREEN_WIDTH,
    borderRadius: 34,
    overflow: 'hidden',
  },
  notchLayer: {
    position: 'absolute',
    top: spacing.sm + 6,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  notch: {
    width: 104,
    height: 22,
    borderRadius: 11,
    backgroundColor: FRAME_COLOR,
  },
});
