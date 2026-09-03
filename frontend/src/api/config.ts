import Constants from 'expo-constants';

// The FastAPI dev server (`uvicorn app.main:app --reload`) listens here.
const DEV_API_PORT = 8000;

/**
 * Dev fallback base URL: the backend on port 8000 of whatever host is serving
 * the JS bundle. That resolves to `localhost` for the web build and the iOS
 * simulator, and to the dev machine's LAN IP for a physical device — the same
 * host Metro already reachably uses.
 */
function devFallbackBaseUrl(): string {
  const metroHost = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${metroHost ?? 'localhost'}:${DEV_API_PORT}`;
}

/**
 * Base URL every API request is resolved against, without a trailing slash.
 *
 * Set `EXPO_PUBLIC_API_URL` (Expo inlines `EXPO_PUBLIC_*` at build time) to
 * point at a deployed backend; otherwise the dev fallback above is used.
 */
export const API_BASE_URL: string = (
  process.env.EXPO_PUBLIC_API_URL?.trim() || devFallbackBaseUrl()
).replace(/\/+$/, '');
