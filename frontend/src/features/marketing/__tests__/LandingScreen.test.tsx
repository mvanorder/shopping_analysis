import type { ReactNode } from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';

import {
  act,
  fireEvent,
  renderWithProviders,
  screen,
  waitFor,
} from '../../../../test-utils/render';
import { LandingScreen } from '../LandingScreen';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions');

const mockSignOut = jest.fn();
let mockAuth: {
  status: 'loading' | 'authenticated' | 'unauthenticated';
  user: { display_name: string | null; email: string } | null;
  signOut: jest.Mock;
};

// The screen reads `useAuth()` for the top bar's signed-in state; drive it from
// the test. The passthrough `AuthProvider` keeps `renderWithProviders` working.
jest.mock('../../auth/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => mockAuth,
}));

const mockRouterPush = jest.fn();

// The screen navigates to `/login` through `useRouter`; there is no router
// context mounted here, so stub the hook and assert on the push.
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn() }),
}));

// Paper's Snackbar runs an entrance animation whose `Animated.start()` callback
// lands outside React's act() window ("not wrapped in act"). This screen only
// uses it as a plain acknowledgement, so a synchronous stand-in keeps the
// visible / dismiss / action behaviour the tests check without the noise.
//
// The override goes through a Proxy rather than `{ ...Actual }`: Paper's entry
// point is ~50 lazy re-export getters, and spreading forces every component
// (and its deps) to load up front - enough to time a slow filesystem out.
// (jest.mock factories are hoisted above imports, so they must `require`.)
jest.mock('react-native-paper', () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const Actual = jest.requireActual('react-native-paper');
  const { View, Text, Pressable } = require('react-native');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const Snackbar = (props: {
    visible: boolean;
    children: ReactNode;
    onDismiss?: () => void;
    action?: { label: string; onPress: () => void };
  }) => {
    if (!props.visible) return null;
    return (
      <View>
        <Text>{props.children}</Text>
        <Pressable accessibilityLabel="dismiss-snackbar" onPress={props.onDismiss}>
          <Text>dismiss</Text>
        </Pressable>
        {props.action ? (
          <Pressable onPress={props.action.onPress}>
            <Text>{props.action.label}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };
  return new Proxy(Actual, {
    get: (target, prop) => (prop === 'Snackbar' ? Snackbar : target[prop]),
  });
});

const mockedUseWindowDimensions = jest.mocked(useWindowDimensions);

function setViewport(width: number) {
  mockedUseWindowDimensions.mockReturnValue({
    width,
    height: 900,
    scale: 2,
    fontScale: 1,
  });
}

beforeEach(() => {
  mockAuth = { status: 'unauthenticated', user: null, signOut: mockSignOut };
});

afterEach(() => {
  mockedUseWindowDimensions.mockReset();
  mockRouterPush.mockClear();
  mockSignOut.mockClear();
  jest.restoreAllMocks();
});

describe('LandingScreen', () => {
  it('renders every section of the page on a compact viewport', async () => {
    setViewport(375);
    await renderWithProviders(<LandingScreen />);

    expect(
      screen.getByText("Know what you'll need before you run out."),
    ).toBeOnTheScreen();
    expect(screen.getByText('How it works')).toBeOnTheScreen();
    expect(screen.getByText('A live look at your trends.')).toBeOnTheScreen();
    expect(screen.getByText('Ready to see your own patterns?')).toBeOnTheScreen();
    expect(screen.getByText(/personal project for understanding/i)).toBeOnTheScreen();
  });

  it('renders the mid-width (medium) layout', async () => {
    setViewport(800);
    await renderWithProviders(<LandingScreen />);

    expect(screen.getByText('How it works')).toBeOnTheScreen();
    expect(screen.getByText('A live look at your trends.')).toBeOnTheScreen();
  });

  it('renders the two-column layout on an expanded viewport', async () => {
    setViewport(1280);
    await renderWithProviders(<LandingScreen />);

    expect(screen.getByText('How it works')).toBeOnTheScreen();
    expect(
      screen.getByText('Example preview — your own history fills this in.'),
    ).toBeOnTheScreen();
  });

  it('navigates to the login route from the header "Log in" action', async () => {
    setViewport(1280);
    await renderWithProviders(<LandingScreen />);

    fireEvent.press(screen.getByLabelText('Log in to Shopping Analysis'));

    expect(mockRouterPush).toHaveBeenCalledWith('/login');
  });

  it('shows the signed-in identity and logs out from the header once authenticated', async () => {
    setViewport(1280);
    mockAuth = {
      status: 'authenticated',
      user: { display_name: null, email: 'shopper@example.com' },
      signOut: mockSignOut,
    };
    await renderWithProviders(<LandingScreen />);

    expect(screen.getByText('shopper@example.com')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Log in to Shopping Analysis')).not.toBeOnTheScreen();

    fireEvent.press(screen.getByLabelText('Log out'));

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('acknowledges a "Get started" tap with an honest snackbar', async () => {
    setViewport(1280);
    await renderWithProviders(<LandingScreen />);

    expect(screen.queryByText(/Sign-up isn.t wired up yet/)).not.toBeOnTheScreen();

    fireEvent.press(screen.getByLabelText('Get started with Shopping Analysis'));

    await waitFor(() =>
      expect(screen.getByText(/Sign-up isn.t wired up yet/)).toBeOnTheScreen(),
    );
  });

  it('dismisses the snackbar from its OK action', async () => {
    setViewport(1280);
    await renderWithProviders(<LandingScreen />);

    fireEvent.press(screen.getByLabelText('Get started with Shopping Analysis'));
    await waitFor(() =>
      expect(screen.getByText(/Sign-up isn.t wired up yet/)).toBeOnTheScreen(),
    );

    fireEvent.press(screen.getByText('OK'));

    await waitFor(() =>
      expect(screen.queryByText(/Sign-up isn.t wired up yet/)).not.toBeOnTheScreen(),
    );
  });

  it('dismisses the snackbar when it times out on its own', async () => {
    setViewport(1280);
    await renderWithProviders(<LandingScreen />);

    fireEvent.press(screen.getByLabelText('Get started with Shopping Analysis'));
    await waitFor(() =>
      expect(screen.getByText(/Sign-up isn.t wired up yet/)).toBeOnTheScreen(),
    );

    fireEvent.press(screen.getByLabelText('dismiss-snackbar'));

    await waitFor(() =>
      expect(screen.queryByText(/Sign-up isn.t wired up yet/)).not.toBeOnTheScreen(),
    );
  });

  it('scrolls to the "How it works" section offset by the measured header height', async () => {
    setViewport(1280);
    const scrollTo = jest
      .spyOn(ScrollView.prototype, 'scrollTo')
      .mockImplementation(() => {});

    const { root } = await renderWithProviders(<LandingScreen />);

    // The screen has exactly two onLayout handlers, in source order: the sticky
    // header wrapper, then the "How it works" section band.
    const [headerNode, sectionNode] = root!.queryAll(
      (node) => typeof node.props.onLayout === 'function',
    );
    expect(sectionNode).toBeDefined();

    // Await each event before the next - firing them in a tight loop overlaps
    // act scopes on the concurrent renderer.
    await act(async () => {
      fireEvent(headerNode, 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 1280, height: 96 } },
      });
    });
    await act(async () => {
      fireEvent(sectionNode, 'layout', {
        nativeEvent: { layout: { x: 0, y: 1400, width: 1280, height: 600 } },
      });
    });

    fireEvent.press(screen.getByLabelText('See how it works'));

    // y = howItWorksY (1400) - headerHeight (96), so the heading clears the bar.
    expect(scrollTo).toHaveBeenCalledWith({ y: 1304, animated: true });
  });

  it('clamps the scroll target to zero before the section has been measured', async () => {
    setViewport(1280);
    const scrollTo = jest
      .spyOn(ScrollView.prototype, 'scrollTo')
      .mockImplementation(() => {});

    await renderWithProviders(<LandingScreen />);

    fireEvent.press(screen.getByLabelText('See how it works'));

    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
  });
});
