import { Platform } from 'react-native';
import { renderHook } from '@testing-library/react-native';

import { useWebFocusRing } from '../webFocusRing';

describe('useWebFocusRing on native', () => {
  it('is a no-op when the platform is not web', async () => {
    const originalOS = Platform.OS;
    Platform.OS = 'ios';

    await expect(renderHook(() => useWebFocusRing('#0F6FD1'))).resolves.toBeDefined();

    Platform.OS = originalOS;
  });
});
