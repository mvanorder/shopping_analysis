import { render } from '@testing-library/react-native';
import { Stack } from 'expo-router';

import RootLayout from '../_layout';

// Defined inside the factory on purpose: jest.mock is hoisted above the
// imports, so a Stack defined at module scope would still be in its temporal
// dead zone when the factory runs.
jest.mock('expo-router', () => ({
  Stack: jest.fn(() => null),
}));

describe('RootLayout', () => {
  it('renders the expo-router stack navigator', async () => {
    await render(<RootLayout />);

    expect(jest.mocked(Stack)).toHaveBeenCalled();
  });
});
