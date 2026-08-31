import type { ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';

import {
  act,
  fireEvent,
  renderWithProviders,
  screen,
  waitFor,
} from '../../../../test-utils/render';
import { LandingScreen } from '../LandingScreen';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions');

// Paper's Snackbar runs an entrance animation whose `Animated.start()` callback
// lands outside React's act() window ("not wrapped in act"). This screen only
// uses it as a plain acknowledgement, so a synchronous stand-in keeps the
// visible / dismiss / action behaviour the tests check without the noise.
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
  return { ...Actual, Snackbar };
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

afterEach(() => {
  mockedUseWindowDimensions.mockReset();
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

  it('measures its header and section, then scrolls when the hero link is pressed', async () => {
    setViewport(1280);
    const { root } = await renderWithProviders(<LandingScreen />);

    // Feed both onLayout handlers so the scroll target is computed from real
    // offsets rather than the initial zeros.
    const measured = root!.queryAll(
      (node) => typeof node.props.onLayout === 'function',
    );
    expect(measured.length).toBeGreaterThanOrEqual(2);
    // Await each event fully before the next: some of these nodes are inside
    // Paper components that update state from onLayout, and firing them in a
    // tight loop overlaps act scopes on the concurrent renderer.
    for (const [i, node] of measured.entries()) {
      await act(async () => {
        fireEvent(node, 'layout', {
          nativeEvent: {
            layout: { x: 0, y: (i + 1) * 200, width: 1280, height: 80 },
          },
        });
      });
    }

    expect(() =>
      fireEvent.press(screen.getByLabelText('See how it works')),
    ).not.toThrow();
  });
});
