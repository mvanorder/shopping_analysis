// `API_BASE_URL` is computed once at module load, so each case re-imports the
// module with a fresh `expo-constants` mock and a tweaked environment.
const ENV = process.env as Record<string, string | undefined>;

function loadBaseUrl(hostUri: string | undefined): string {
  let value = '';
  jest.isolateModules(() => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: { expoConfig: hostUri === undefined ? null : { hostUri } },
    }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    value = require('../config').API_BASE_URL as string;
  });
  return value;
}

describe('API_BASE_URL', () => {
  const original = ENV.EXPO_PUBLIC_API_URL;

  afterEach(() => {
    if (original === undefined) {
      delete ENV.EXPO_PUBLIC_API_URL;
    } else {
      ENV.EXPO_PUBLIC_API_URL = original;
    }
    jest.dontMock('expo-constants');
  });

  it('prefers EXPO_PUBLIC_API_URL, trimming trailing slashes', () => {
    ENV.EXPO_PUBLIC_API_URL = 'https://api.example.com/';
    expect(loadBaseUrl('192.168.1.20:8081')).toBe('https://api.example.com');
  });

  it('ignores a blank EXPO_PUBLIC_API_URL and uses the dev fallback', () => {
    ENV.EXPO_PUBLIC_API_URL = '   ';
    expect(loadBaseUrl('10.0.0.5:8081')).toBe('http://10.0.0.5:8000');
  });

  it('derives the dev URL from the Metro host on port 8000', () => {
    delete ENV.EXPO_PUBLIC_API_URL;
    expect(loadBaseUrl('192.168.1.20:8081')).toBe('http://192.168.1.20:8000');
  });

  it('falls back to localhost when no Metro host is known', () => {
    delete ENV.EXPO_PUBLIC_API_URL;
    expect(loadBaseUrl(undefined)).toBe('http://localhost:8000');
  });
});
