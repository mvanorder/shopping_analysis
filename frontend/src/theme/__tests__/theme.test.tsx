import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { PaperProvider } from 'react-native-paper';

import { darkPalette, palette } from '../tokens';
import { darkTheme, lightTheme, useAppTheme } from '../theme';

describe('app themes', () => {
  it('maps the light palette onto the MD3 colour slots', () => {
    expect(lightTheme.colors.primary).toBe(palette.primary);
    expect(lightTheme.colors.accent).toBe(palette.accent);
    expect(lightTheme.colors.primaryBright).toBe(palette.primaryBright);
    expect(lightTheme.dark).toBe(false);
  });

  it('maps the dark palette onto the same slots', () => {
    expect(darkTheme.colors.primary).toBe(darkPalette.primary);
    expect(darkTheme.colors.surfaceMuted).toBe(darkPalette.surfaceMuted);
    expect(darkTheme.dark).toBe(true);
  });

  it('flattens every elevation level to one surface colour', () => {
    const levels = Object.values(lightTheme.colors.elevation).filter(
      (c) => c !== 'transparent',
    );
    expect(new Set(levels)).toEqual(new Set([palette.surface]));
  });

  it('rounds corners to 12pt (roundness 3 x Paper\'s 4)', () => {
    expect(lightTheme.roundness).toBe(3);
  });

  it('uses the Sora display face for headline variants', () => {
    expect(lightTheme.fonts.headlineLarge.fontFamily).toBe('Sora_700Bold');
  });

  it('useAppTheme returns the theme from the Paper provider', async () => {
    let seen: string | undefined;
    function Probe() {
      seen = useAppTheme().colors.accent;
      return <Text>probe</Text>;
    }

    await render(
      <PaperProvider theme={darkTheme}>
        <Probe />
      </PaperProvider>,
    );

    expect(seen).toBe(darkPalette.accent);
  });
});
