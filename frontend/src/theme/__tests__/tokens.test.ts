import { darkPalette, layout, palette, radius, spacing } from '../tokens';

describe('design tokens', () => {
  it('defines the same colour roles in both palettes', () => {
    expect(Object.keys(darkPalette).sort()).toEqual(Object.keys(palette).sort());
  });

  it('keeps every palette value a hex colour', () => {
    for (const value of [...Object.values(palette), ...Object.values(darkPalette)]) {
      expect(value).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('shares the raw brand blue as the decorative-only bright colour', () => {
    expect(palette.primaryBright).toBe('#208AEF');
    expect(darkPalette.primaryBright).toBe('#208AEF');
  });

  it('exposes an ascending 4pt spacing scale', () => {
    const values = Object.values(spacing);
    expect(values.every((n) => n % 4 === 0)).toBe(true);
    const sorted = [...values].sort((a, b) => a - b);
    expect(values).toEqual(sorted);
  });

  it('exposes a pill radius large enough to fully round any control', () => {
    expect(radius.pill).toBeGreaterThanOrEqual(999);
  });

  it('caps content width above the two-column breakpoint', () => {
    expect(layout.maxContentWidth).toBeGreaterThan(layout.breakpoints.expanded);
    expect(layout.breakpoints.expanded).toBeGreaterThan(layout.breakpoints.medium);
  });

  it('keeps the minimum touch target at the 44pt platform floor', () => {
    expect(layout.minTouchTarget).toBe(44);
  });
});
