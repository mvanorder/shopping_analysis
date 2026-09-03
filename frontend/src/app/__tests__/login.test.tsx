import { act, fireEvent, renderWithProviders, screen, waitFor } from '../../../test-utils/render';
import { ApiError } from '../../api/client';
import { login } from '../../features/auth/api';
import { storeTokenPair } from '../../features/auth/tokenStorage';

import Login from '../login';

const mockReplace = jest.fn();

// `Stack.Screen` only sets navigator options and needs a route context we do
// not mount here; `useRouter` is stubbed because the route handler and the
// footer "Get started" action both read it.
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
}));

jest.mock('../../features/auth/api', () => ({ login: jest.fn() }));
jest.mock('../../features/auth/tokenStorage', () => ({ storeTokenPair: jest.fn() }));

const mockLogin = login as jest.MockedFunction<typeof login>;
const mockStoreTokenPair = storeTokenPair as jest.MockedFunction<typeof storeTokenPair>;

const tokenPair = {
  access_token: 'access-jwt',
  refresh_token: 'refresh-opaque',
  token_type: 'bearer' as const,
  expires_in: 900,
};

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
  jest.clearAllMocks();
});

describe('Login screen', () => {
  it('renders the login form at the /login route', async () => {
    await renderWithProviders(<Login />);

    expect(await screen.findByText('Welcome back')).toBeOnTheScreen();
    expect(screen.getByLabelText('Email')).toBeOnTheScreen();
    expect(screen.getByLabelText('Password')).toBeOnTheScreen();
  });

  it('logs in, stores the token pair, and returns home on success', async () => {
    mockLogin.mockResolvedValue(tokenPair);
    mockStoreTokenPair.mockResolvedValue();

    await renderWithProviders(<Login />);
    await type('Email', '  shopper@example.com  ');
    await type('Password', 's3cret-pass');
    await press('Log in');

    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'shopper@example.com',
        password: 's3cret-pass',
      }),
    );
    expect(mockStoreTokenPair).toHaveBeenCalledWith(tokenPair);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });

  it('surfaces a rejected login and does not store a token or navigate', async () => {
    mockLogin.mockRejectedValue(new ApiError(401, 'Invalid email or password'));

    await renderWithProviders(<Login />);
    await type('Email', 'shopper@example.com');
    await type('Password', 'wrong-pass');
    await press('Log in');

    await waitFor(() =>
      expect(screen.getByText('Invalid email or password')).toBeOnTheScreen(),
    );
    expect(mockStoreTokenPair).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
