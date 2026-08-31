import { useWindowDimensions } from 'react-native';

// Usage: add `jest.mock('react-native/Libraries/Utilities/useWindowDimensions')`
// at the top of the test file (it hoists), then drive the width with these.
const mocked = jest.mocked(useWindowDimensions);

export function setViewport(width: number) {
  mocked.mockReturnValue({ width, height: 900, scale: 2, fontScale: 1 });
}

export function resetViewport() {
  mocked.mockReset();
}
