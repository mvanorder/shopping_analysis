import * as theme from '../index';

describe('theme barrel', () => {
  it('re-exports the public theme surface', () => {
    expect(typeof theme.useAppTheme).toBe('function');
    expect(typeof theme.useResponsive).toBe('function');
    expect(typeof theme.useThemePreference).toBe('function');
    expect(typeof theme.useWebFocusRing).toBe('function');
    expect(typeof theme.heading).toBe('function');
    expect(theme.lightTheme.colors.primary).toBe(theme.palette.primary);
    expect(theme.spacing.md).toBe(16);
    expect(theme.radius.pill).toBe(999);
    expect(theme.layout.minTouchTarget).toBe(44);
    expect(theme.darkPalette.primaryBright).toBe(theme.palette.primaryBright);
  });
});
