import { useEffect, useLayoutEffect, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

import { layout, spacing } from './tokens';

export type Breakpoint = 'compact' | 'medium' | 'expanded';

export type Responsive = {
  width: number;
  breakpoint: Breakpoint;
  /** Phones and narrow web windows: everything stacks in one column. */
  isCompact: boolean;
  /** >= 700pt: 3-up rows fit side by side (tablet portrait, phone landscape). */
  isMedium: boolean;
  /** >= 1024pt: true two-column sections (desktop web, tablet landscape). */
  isExpanded: boolean;
  /**
   * Only desktop-scale *web* gets the decorative phone bezel around the
   * dashboard preview. Drawing a fake phone outline on a real phone (or on a
   * narrow browser window that already looks like one) reads as a mistake, so
   * native and compact web render the same content as a plain card.
   */
  showDeviceFrame: boolean;
  /** Horizontal page gutter. */
  gutter: number;
  /** Vertical rhythm between major sections. */
  sectionSpacing: number;
};

const isWeb = Platform.OS === 'web';
const hasDom = isWeb && typeof document !== 'undefined';

/**
 * `app.json` sets `web.output: "static"`, so pages are prerendered in Node where
 * `useWindowDimensions` reports 0x0 and every layout resolves to `compact`.
 * Rendering the compact layout for the very first client pass too keeps
 * hydration byte-identical; the real width is picked up in a layout effect,
 * before the browser paints the hydrated tree.
 */
const useHydrationEffect = hasDom ? useLayoutEffect : useEffect;

export function useResponsive(): Responsive {
  const { width } = useWindowDimensions();
  const [isHydrated, setIsHydrated] = useState(!isWeb);

  useHydrationEffect(() => {
    if (!isHydrated) setIsHydrated(true);
  }, [isHydrated]);

  const effectiveWidth = isHydrated ? width : 0;

  const isExpanded = effectiveWidth >= layout.breakpoints.expanded;
  const isMedium = effectiveWidth >= layout.breakpoints.medium;
  const breakpoint: Breakpoint = isExpanded
    ? 'expanded'
    : isMedium
      ? 'medium'
      : 'compact';

  return {
    width: effectiveWidth,
    breakpoint,
    isCompact: !isMedium,
    isMedium,
    isExpanded,
    showDeviceFrame: isWeb && isExpanded,
    gutter: isExpanded ? spacing.xl : isMedium ? spacing.lg : spacing.md,
    sectionSpacing: isExpanded ? spacing.xxxl : isMedium ? spacing.xxl : spacing.xl,
  };
}
