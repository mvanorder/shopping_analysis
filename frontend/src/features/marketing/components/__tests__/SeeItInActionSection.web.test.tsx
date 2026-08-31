/**
 * @jest-environment jsdom
 */
import { Platform, useWindowDimensions } from 'react-native';

import { renderWithProviders, screen } from '../../../../../test-utils/render';
import { setViewport, resetViewport } from '../../../../../test-utils/viewport';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions');

void useWindowDimensions;

// `useResponsive` only reports `showDeviceFrame` on desktop-scale web, and it
// latches `Platform.OS` at module-eval time — so the section (and the hook it
// pulls in) must be loaded after switching to web.

describe('SeeItInActionSection on desktop web', () => {
  const originalOS = Platform.OS;

  beforeAll(() => {
    Platform.OS = 'web';
  });

  afterAll(() => {
    Platform.OS = originalOS;
  });

  afterEach(resetViewport);

  function loadSection() {
    // A lazy require (not a top-level import) so the module evaluates *after*
    // `Platform.OS` is set to web above; jest runs without the VM-modules flag,
    // so `await import()` is not available here.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('../SeeItInActionSection') as typeof import('../SeeItInActionSection'))
      .SeeItInActionSection;
  }

  it('wraps the dashboard preview in the decorative phone frame at desktop width', async () => {
    setViewport(1280);
    const SeeItInActionSection = loadSection();

    await renderWithProviders(<SeeItInActionSection onGetStarted={jest.fn()} />);

    // The frame is the whole point of the desktop-web branch.
    expect(screen.getByTestId('phone-frame')).toBeOnTheScreen();
    expect(screen.getByText('Good afternoon')).toBeOnTheScreen();
  });

  it('drops the phone frame and shows a plain card on a phone-width browser window', async () => {
    setViewport(400);
    const SeeItInActionSection = loadSection();

    await renderWithProviders(<SeeItInActionSection onGetStarted={jest.fn()} />);

    expect(screen.queryByTestId('phone-frame')).not.toBeOnTheScreen();
    expect(screen.getByText('Good afternoon')).toBeOnTheScreen();
  });
});
