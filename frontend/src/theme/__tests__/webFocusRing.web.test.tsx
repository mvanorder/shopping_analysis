/**
 * @jest-environment jsdom
 */
import { Platform } from 'react-native';
import { renderHook } from '@testing-library/react-native';

import { useWebFocusRing } from '../webFocusRing';

const STYLE_ID = 'shopping-analysis-focus-ring';

describe('useWebFocusRing on web', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    Platform.OS = 'web';
    document.getElementById(STYLE_ID)?.remove();
  });

  afterEach(() => {
    Platform.OS = originalOS;
  });

  it('injects a single :focus-visible style rule carrying the given colour', async () => {
    await renderHook(() => useWebFocusRing('#0F6FD1'));

    const style = document.getElementById(STYLE_ID);
    expect(style).not.toBeNull();
    expect(style?.textContent).toContain(':focus-visible');
    expect(style?.textContent).toContain('#0F6FD1');
  });

  it('reuses the same style node and updates the colour when it changes', async () => {
    const { rerender } = await renderHook(
      ({ color }: { color: string }) => useWebFocusRing(color),
      { initialProps: { color: '#0F6FD1' } },
    );

    await rerender({ color: '#8EC7F7' });

    expect(document.querySelectorAll(`#${STYLE_ID}`)).toHaveLength(1);
    expect(document.getElementById(STYLE_ID)?.textContent).toContain('#8EC7F7');
  });
});
