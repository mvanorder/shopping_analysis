import { appFontConfig, appFonts, displayFont } from '../fonts';

describe('font configuration', () => {
  it('loads the three Sora weights used by the display face', () => {
    expect(Object.keys(appFonts)).toEqual([
      'Sora_400Regular',
      'Sora_600SemiBold',
      'Sora_700Bold',
    ]);
  });

  it('overrides only the display and headline typescale variants', () => {
    const overridden = (
      [
        'displayLarge',
        'displayMedium',
        'displaySmall',
        'headlineLarge',
        'headlineMedium',
        'headlineSmall',
      ] as const
    ).map((key) => appFontConfig[key].fontFamily);

    expect(overridden).toEqual([
      displayFont.bold,
      displayFont.bold,
      displayFont.bold,
      displayFont.bold,
      displayFont.bold,
      displayFont.semiBold,
    ]);
  });

  it('leaves body and label variants on the system face', () => {
    expect(appFontConfig.bodyLarge.fontFamily).not.toMatch(/^Sora/);
    expect(appFontConfig.labelMedium.fontFamily).not.toMatch(/^Sora/);
  });

  it('selects weight through the family name, never a synthesised bold', () => {
    expect(appFontConfig.displayLarge.fontWeight).toBe('400');
    expect(appFontConfig.displayLarge.letterSpacing).toBeLessThan(0);
  });
});
