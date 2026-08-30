import { render, screen } from '@testing-library/react-native';

import Index from '../index';

describe('Index screen', () => {
  it('renders the placeholder copy', async () => {
    await render(<Index />);

    expect(
      screen.getByText('Edit src/app/index.tsx to edit this screen.'),
    ).toBeTruthy();
  });
});
