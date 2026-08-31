import { render } from '@testing-library/react-native';
import * as ReactNative from 'react-native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import RootLayout from '../_layout';

// Defined inside each factory on purpose: jest.mock is hoisted above the
// imports, so anything referenced at module scope would still be in its
// temporal dead zone when the factory runs.
jest.mock('expo-router', () => ({
  Stack: jest.fn(() => null),
}));

jest.mock('expo-font', () => ({
  useFonts: jest.fn(() => [true, null]),
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

const mockedUseFonts = jest.mocked(useFonts);

describe('RootLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseFonts.mockReturnValue([true, null]);
  });

  it('renders the expo-router stack once the fonts have loaded', async () => {
    await render(<RootLayout />);

    expect(jest.mocked(Stack)).toHaveBeenCalled();
  });

  it('hides the splash screen after mount', async () => {
    await render(<RootLayout />);

    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  });

  it('renders nothing until the fonts resolve', () => {
    mockedUseFonts.mockReturnValue([false, null]);

    render(<RootLayout />);

    expect(jest.mocked(Stack)).not.toHaveBeenCalled();
  });

  it('still renders when the fonts fail to load', async () => {
    mockedUseFonts.mockReturnValue([false, new Error('font 404')]);

    await render(<RootLayout />);

    expect(jest.mocked(Stack)).toHaveBeenCalled();
  });

  it('selects the dark Paper theme when the OS is in dark mode', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');

    await render(<RootLayout />);

    expect(jest.mocked(Stack)).toHaveBeenCalled();
    const [{ screenOptions }] = jest.mocked(Stack).mock.calls[0] as [
      { screenOptions: { contentStyle: { backgroundColor: string } } },
    ];
    // #0E161C is darkPalette.background.
    expect(screenOptions.contentStyle.backgroundColor).toBe('#0E161C');
  });
});
