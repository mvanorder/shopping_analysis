/**
 * @jest-environment jsdom
 */
import { Platform, useWindowDimensions } from 'react-native';

import {
  renderWithProviders,
  screen,
} from '../../../../../test-utils/render';
import { setViewport, resetViewport } from '../../../../../test-utils/viewport';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions');

void useWindowDimensions;

// `useResponsive` only reports `showDeviceFrame` on desktop-scale web, and it
// latches `Platform.OS` at module-eval time — so the section (and the hook it
// pulls in) must be required after switching to web.

describe('SeeItInActionSection on desktop web', () => {
  const originalOS = Platform.OS;

  beforeAll(() => {
    Platform.OS = 'web';
  });

  afterAll(() => {
    Platform.OS = originalOS;
  });

  afterEach(resetViewport);

  it('wraps the dashboard preview in the decorative phone frame', async () => {
    setViewport(1280);
    const { SeeItInActionSection } =
      require('../SeeItInActionSection') as typeof import('../SeeItInActionSection');

    await renderWithProviders(<SeeItInActionSection onGetStarted={jest.fn()} />);

    expect(screen.getByText('A live look at your trends.')).toBeOnTheScreen();
    expect(screen.getByText('Good afternoon')).toBeOnTheScreen();
    expect(
      screen.getByText('Example preview — your own history fills this in.'),
    ).toBeOnTheScreen();
  });

  it('shows a plain card preview on a phone-width browser window', async () => {
    setViewport(400);
    const { SeeItInActionSection } =
      require('../SeeItInActionSection') as typeof import('../SeeItInActionSection');

    await renderWithProviders(<SeeItInActionSection onGetStarted={jest.fn()} />);

    expect(screen.getByText('Good afternoon')).toBeOnTheScreen();
  });
});
