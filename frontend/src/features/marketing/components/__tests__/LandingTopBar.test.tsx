import { useWindowDimensions } from 'react-native';

import {
  act,
  fireEvent,
  renderWithProviders,
  screen,
} from '../../../../../test-utils/render';
import { LandingTopBar } from '../LandingTopBar';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions');

// This component takes its account state as a prop, so the real AuthProvider's
// async hydration is just noise that overlaps act() scopes on the concurrent
// renderer. A passthrough keeps renderWithProviders working without it.
jest.mock('../../../auth/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({ status: 'unauthenticated', user: null, signIn: jest.fn(), signOut: jest.fn() }),
}));

const mockedUseWindowDimensions = jest.mocked(useWindowDimensions);

function setViewport(width: number) {
  mockedUseWindowDimensions.mockReturnValue({ width, height: 900, scale: 2, fontScale: 1 });
}

// This project's RNTL renders on a concurrent root; a synchronous fireEvent
// overlaps act() scopes and wedges the renderer for the rest of the file.
async function press(label: string) {
  await act(async () => {
    fireEvent.press(screen.getByLabelText(label));
  });
}

afterEach(() => {
  mockedUseWindowDimensions.mockReset();
});

describe('LandingTopBar', () => {
  it('shows the "Log in" / "Get started" actions when signed out', async () => {
    setViewport(1280);
    const onLogIn = jest.fn();
    const onGetStarted = jest.fn();

    await renderWithProviders(
      <LandingTopBar onLogIn={onLogIn} onGetStarted={onGetStarted} />,
    );

    await press('Log in to Shopping Analysis');
    await press('Get started with Shopping Analysis');

    expect(onLogIn).toHaveBeenCalledTimes(1);
    expect(onGetStarted).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('Log out')).not.toBeOnTheScreen();
  });

  it('shows the signed-in identity and a "Log out" action when an account is given', async () => {
    setViewport(1280);
    const onLogOut = jest.fn();

    await renderWithProviders(
      <LandingTopBar
        onLogIn={jest.fn()}
        onGetStarted={jest.fn()}
        account={{ label: 'shopper@example.com', onLogOut }}
      />,
    );

    expect(screen.getByText('shopper@example.com')).toBeOnTheScreen();
    expect(screen.getByLabelText('Signed in as shopper@example.com')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Log in to Shopping Analysis')).not.toBeOnTheScreen();

    await press('Log out');
    expect(onLogOut).toHaveBeenCalledTimes(1);
  });

  it('drops the address label on a compact viewport, keeping the log-out action', async () => {
    setViewport(375);

    await renderWithProviders(
      <LandingTopBar
        onLogIn={jest.fn()}
        onGetStarted={jest.fn()}
        account={{ label: 'shopper@example.com', onLogOut: jest.fn() }}
      />,
    );

    expect(screen.queryByText('shopper@example.com')).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Signed in as shopper@example.com')).toBeOnTheScreen();
    expect(screen.getByLabelText('Log out')).toBeOnTheScreen();
  });
});
