/**
 * Design tokens for Shopping Analysis.
 *
 * These are the single source of truth for brand colour, spacing, radii and
 * layout breakpoints. Screens should read them through the Paper theme
 * (`useAppTheme()`) wherever a Paper equivalent exists, and import `spacing` /
 * `radius` / `layout` directly for layout glue.
 *
 * Contrast notes (WCAG 2.1 AA):
 * - `primary` is a slightly deepened version of the raw brand blue `#208AEF`
 *   (kept below as `primaryBright`). `#208AEF` only reaches 3.5:1 against
 *   white, which fails AA for button labels and body copy sitting on a filled
 *   blue surface. `#0F6FD1` is the same hue at ~4.98:1, so every
 *   white-on-primary surface (filled buttons, CTA band, preview header) passes.
 *   `primaryBright` is retained for decorative fills that carry no text
 *   (it is also the splash-screen colour in app.json).
 * - `accent` is a touch deeper than the raw `#B4650A` so the small "due soon"
 *   badge label reaches 5.0:1 on `accentContainer` instead of 4.0:1.
 */

export const palette = {
  /** Accessible brand blue - use for anything that carries white text. */
  primary: '#0F6FD1',
  /** Raw brand blue (splash + adaptive icon). Decorative fills only. */
  primaryBright: '#208AEF',
  onPrimary: '#FFFFFF',
  primaryContainer: '#E6F4FE',
  onPrimaryContainer: '#0B4A82',

  background: '#F3F7FB',
  surface: '#FFFFFF',
  /** Slightly tinted surface for inset panels (stat chips, list rows). */
  surfaceMuted: '#F7FAFD',

  onSurface: '#16232E',
  onSurfaceVariant: '#5C6B79',
  outline: '#E4EAF0',

  /** Urgency accent - only used by "due soon" badges. */
  accent: '#9A5709',
  accentContainer: '#FFF1DB',
} as const;

/** 4pt spacing scale. Never hand-pick a value outside this. */
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  xxxxl: 96,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  pill: 999,
} as const;

export const layout = {
  /** Widest the centred marketing content is ever allowed to grow. */
  maxContentWidth: 1120,
  /** Cap for a single column of running prose. */
  maxProseWidth: 640,
  /** Minimum interactive size on every platform (pt / CSS px). */
  minTouchTarget: 44,
  breakpoints: {
    /** >= this width: 3-up rows, roomier padding (large phone landscape / tablet). */
    medium: 700,
    /** >= this width: side-by-side two-column sections (desktop web / large tablet). */
    expanded: 1024,
  },
} as const;
