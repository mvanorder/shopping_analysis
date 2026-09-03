import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearTokenPair,
  getAccessToken,
  getRefreshToken,
  storeTokenPair,
} from '../tokenStorage';

const tokenPair = {
  access_token: 'access-jwt',
  refresh_token: 'refresh-opaque',
  token_type: 'bearer' as const,
  expires_in: 900,
};

afterEach(async () => {
  await AsyncStorage.clear();
});

describe('tokenStorage', () => {
  it('round-trips the access and refresh tokens', async () => {
    await storeTokenPair(tokenPair);

    await expect(getAccessToken()).resolves.toBe('access-jwt');
    await expect(getRefreshToken()).resolves.toBe('refresh-opaque');
  });

  it('returns null for each token before a login', async () => {
    await expect(getAccessToken()).resolves.toBeNull();
    await expect(getRefreshToken()).resolves.toBeNull();
  });

  it('clears both tokens', async () => {
    await storeTokenPair(tokenPair);
    await clearTokenPair();

    await expect(getAccessToken()).resolves.toBeNull();
    await expect(getRefreshToken()).resolves.toBeNull();
  });
});
