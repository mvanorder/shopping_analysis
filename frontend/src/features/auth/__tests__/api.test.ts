import { apiRequest } from '../../../api/client';
import { login } from '../api';

jest.mock('../../../api/client', () => ({ apiRequest: jest.fn() }));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

const tokenPair = {
  access_token: 'a',
  refresh_token: 'r',
  token_type: 'bearer' as const,
  expires_in: 900,
};

afterEach(() => {
  mockApiRequest.mockReset();
});

describe('login', () => {
  it('POSTs the credentials to /auth/login and returns the token pair', async () => {
    mockApiRequest.mockResolvedValue(tokenPair);

    await expect(
      login({ email: 'shopper@example.com', password: 'pw' }),
    ).resolves.toEqual(tokenPair);

    expect(mockApiRequest).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      body: { email: 'shopper@example.com', password: 'pw' },
    });
  });

  it('propagates a rejected request', async () => {
    mockApiRequest.mockRejectedValue(new Error('boom'));

    await expect(login({ email: 'x@y.co', password: 'bad' })).rejects.toThrow('boom');
  });
});
