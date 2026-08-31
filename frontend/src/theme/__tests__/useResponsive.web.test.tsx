/**
 * @jest-environment jsdom
 */
import { Platform, useWindowDimensions } from 'react-native';
import { renderHook } from '@testing-library/react-native';

// `useResponsive` reads `Platform.OS` and `document` at module-eval time, so it
// is required lazily *after* the platform is switched to web. With a DOM present
// it also uses `useLayoutEffect` for hydration - the `hasDom` branch the
// default (node) environment can never reach.

jest.mock('react-native/Libraries/Utilities/useWindowDimensions');

const mockedUseWindowDimensions = jest.mocked(useWindowDimensions);

describe('useResponsive on web', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    Platform.OS = 'web';
  });

  afterEach(() => {
    Platform.OS = originalOS;
    mockedUseWindowDimensions.mockReset();
  });

  function loadHook() {
    return (require('../useResponsive') as typeof import('../useResponsive'))
      .useResponsive;
  }

  it('applies the real desktop width through the layout-effect hydration path', async () => {
    mockedUseWindowDimensions.mockReturnValue({
      width: 1280,
      height: 900,
      scale: 2,
      fontScale: 1,
    });
    const useResponsive = loadHook();

    const { result } = await renderHook(() => useResponsive());

    expect(result.current.width).toBe(1280);
    expect(result.current.isExpanded).toBe(true);
    expect(result.current.showDeviceFrame).toBe(true);
  });

  it('does not show the device frame on a phone-width browser window', async () => {
    mockedUseWindowDimensions.mockReturnValue({
      width: 400,
      height: 800,
      scale: 2,
      fontScale: 1,
    });
    const useResponsive = loadHook();

    const { result } = await renderHook(() => useResponsive());

    expect(result.current.isCompact).toBe(true);
    expect(result.current.showDeviceFrame).toBe(false);
  });
});
