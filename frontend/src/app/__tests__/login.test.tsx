import { renderWithProviders, screen } from '../../../test-utils/render';

import Login from '../login';

const mockReplace = jest.fn();

// `Stack.Screen` only sets navigator options and needs a route context we do
// not mount here; `useRouter` is stubbed because the footer "Get started"
// action reads it.
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
}));

describe('Login screen', () => {
  it('renders the login form at the /login route', async () => {
    await renderWithProviders(<Login />);

    expect(await screen.findByText('Welcome back')).toBeOnTheScreen();
    expect(screen.getByLabelText('Email')).toBeOnTheScreen();
    expect(screen.getByLabelText('Password')).toBeOnTheScreen();
  });
});
