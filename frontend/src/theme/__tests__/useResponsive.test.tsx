import { Platform, useWindowDimensions } from 'react-native';
import { renderHook } from '@testing-library/react-native';

import { spacing } from '../tokens';
import { useResponsive } from '../useResponsive';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions');

const mockedUseWindowDimensions = jest.mocked(useWindowDimensions);

function mockWidth(width: number) {
  mockedUseWindowDimensions.mockReturnValue({
    width,
    height: 900,
    scale: 2,
    fontScale: 1,
  });
}

const originalOS = Platform.OS;

afterEach(() => {
  Platform.OS = originalOS;
  mockedUseWindowDimensions.mockReset();
});

describe('useResponsive', () => {
  it('reports the compact breakpoint on a phone-width window', async () => {
    mockWidth(375);
    const { result } = await renderHook(() => useResponsive());

    expect(result.current.breakpoint).toBe('compact');
    expect(result.current.isCompact).toBe(true);
    expect(result.current.gutter).toBe(spacing.md);
    expect(result.current.sectionSpacing).toBe(spacing.xl);
  });

  it('reports the medium breakpoint between 700 and 1024pt', async () => {
    mockWidth(800);
    const { result } = await renderHook(() => useResponsive());

    expect(result.current.breakpoint).toBe('medium');
    expect(result.current.isMedium).toBe(true);
    expect(result.current.isExpanded).toBe(false);
    expect(result.current.gutter).toBe(spacing.lg);
  });

  it('reports the expanded breakpoint on a desktop-width window', async () => {
    mockWidth(1280);
    const { result } = await renderHook(() => useResponsive());

    expect(result.current.breakpoint).toBe('expanded');
    expect(result.current.isExpanded).toBe(true);
    expect(result.current.gutter).toBe(spacing.xl);
    expect(result.current.sectionSpacing).toBe(spacing.xxxl);
  });

  it('never shows the decorative device frame on native', async () => {
    mockWidth(1280);
    Platform.OS = 'ios';

    const { result } = await renderHook(() => useResponsive());

    expect(result.current.showDeviceFrame).toBe(false);
  });
});
