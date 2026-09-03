import type { ReactNode } from 'react';

import {
  act,
  fireEvent,
  renderWithProviders,
  screen,
  waitFor,
} from '../../../../test-utils/render';
import { LoginScreen } from '../LoginScreen';

const mockRouterReplace = jest.fn();
const mockRouterPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: mockRouterReplace }),
}));

// Paper's Snackbar entrance animation resolves outside React's act() window.
// The screen only uses it as a plain acknowledgement, so a synchronous
// stand-in keeps the visible/dismiss behaviour without the noise. (See the
// same pattern in the marketing LandingScreen test.)
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
          <Pressable accessibilityLabel={props.action.label} onPress={props.action.onPress}>
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

// This project's RNTL renders on a concurrent root, so firing events in a
// synchronous run overlaps act() scopes and wedges the renderer for the rest
// of the file. Await each interaction before the next. (The marketing
// LandingScreen test documents the same constraint.)
async function type(label: string, value: string) {
  await act(async () => {
    fireEvent.changeText(screen.getByLabelText(label), value);
  });
}

async function press(label: string) {
  await act(async () => {
    fireEvent.press(screen.getByLabelText(label));
  });
}

afterEach(() => {
  mockRouterReplace.mockClear();
  mockRouterPush.mockClear();
});

describe('LoginScreen', () => {
  it('renders the form heading and both fields', async () => {
    await renderWithProviders(<LoginScreen />);

    expect(await screen.findByText('Welcome back')).toBeOnTheScreen();
    expect(screen.getByLabelText('Email')).toBeOnTheScreen();
    expect(screen.getByLabelText('Password')).toBeOnTheScreen();
  });

  it('shows a required-field error for each empty field and does not submit', async () => {
    const onSubmit = jest.fn();
    await renderWithProviders(<LoginScreen onSubmit={onSubmit} />);

    await press('Log in');

    await waitFor(() =>
      expect(screen.getByText('Enter your email address.')).toBeOnTheScreen(),
    );
    expect(screen.getByText('Enter your password.')).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a malformed email address', async () => {
    const onSubmit = jest.fn();
    await renderWithProviders(<LoginScreen onSubmit={onSubmit} />);

    await type('Email', 'not-an-email');
    await type('Password', 'hunter2!!');
    await press('Log in');

    await waitFor(() =>
      expect(screen.getByText('Enter a valid email address.')).toBeOnTheScreen(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with the trimmed email and password when valid', async () => {
    const onSubmit = jest.fn();
    await renderWithProviders(<LoginScreen onSubmit={onSubmit} />);

    await type('Email', '  shopper@example.com  ');
    await type('Password', 's3cret-pass');
    await press('Log in');

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'shopper@example.com',
        password: 's3cret-pass',
      }),
    );
  });

  it('clears a field error once the user corrects it', async () => {
    await renderWithProviders(<LoginScreen onSubmit={jest.fn()} />);

    await press('Log in');
    await waitFor(() =>
      expect(screen.getByText('Enter your email address.')).toBeOnTheScreen(),
    );

    await type('Email', 'shopper@example.com');

    await waitFor(() =>
      expect(screen.queryByText('Enter your email address.')).not.toBeOnTheScreen(),
    );
  });

  it('acknowledges a valid submission with a snackbar when no handler is wired', async () => {
    await renderWithProviders(<LoginScreen />);

    await type('Email', 'shopper@example.com');
    await type('Password', 's3cret-pass');
    await press('Log in');

    await waitFor(() =>
      expect(screen.getByText(/Sign-in isn.t wired up yet/)).toBeOnTheScreen(),
    );

    await press('OK');
    await waitFor(() =>
      expect(screen.queryByText(/Sign-in isn.t wired up yet/)).not.toBeOnTheScreen(),
    );
  });

  it('dismisses the acknowledgement snackbar when it times out on its own', async () => {
    await renderWithProviders(<LoginScreen />);

    await type('Email', 'shopper@example.com');
    await type('Password', 's3cret-pass');
    await press('Log in');
    await waitFor(() =>
      expect(screen.getByText(/Sign-in isn.t wired up yet/)).toBeOnTheScreen(),
    );

    await press('dismiss-snackbar');
    await waitFor(() =>
      expect(screen.queryByText(/Sign-in isn.t wired up yet/)).not.toBeOnTheScreen(),
    );
  });

  it('handles the email "next" key without disturbing the entered value', async () => {
    await renderWithProviders(<LoginScreen />);

    await type('Email', 'shopper@example.com');
    await act(async () => {
      fireEvent(screen.getByLabelText('Email'), 'submitEditing');
    });

    expect(screen.getByLabelText('Email').props.value).toBe('shopper@example.com');
  });

  it('toggles password visibility', async () => {
    await renderWithProviders(<LoginScreen />);

    expect((await screen.findByLabelText('Password')).props.secureTextEntry).toBe(true);

    await press('Show password');

    await waitFor(() =>
      expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(false),
    );
    expect(screen.getByLabelText('Hide password')).toBeOnTheScreen();
  });

  it('sends a would-be signer-upper back to the landing page', async () => {
    await renderWithProviders(<LoginScreen />);

    await press('Get started');

    expect(mockRouterReplace).toHaveBeenCalledWith('/');
  });
});
