import { Text } from 'react-native';

import { renderWithProviders, screen } from '../../../../../test-utils/render';
import { PHONE_FRAME_STATUS_BAR, PhoneFrame } from '../PhoneFrame';

describe('PhoneFrame', () => {
  it('renders its children inside the decorative bezel', async () => {
    await renderWithProviders(
      <PhoneFrame>
        <Text>framed content</Text>
      </PhoneFrame>,
    );

    expect(screen.getByText('framed content')).toBeOnTheScreen();
  });

  it('exposes the status-bar inset content must clear', () => {
    expect(PHONE_FRAME_STATUS_BAR).toBeGreaterThan(0);
  });
});
