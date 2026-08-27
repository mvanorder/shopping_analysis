import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';

/** What the user picked. `'system'` follows the OS appearance. */
export type ThemeMode = 'system' | 'light' | 'dark';
/** The scheme actually in effect once `'system'` is resolved. */
export type ColorScheme = 'light' | 'dark';

const STORAGE_KEY = 'shopping-analysis/theme-mode';

type ThemePreference = {
  mode: ThemeMode;
  scheme: ColorScheme;
  /**
   * `false` until the persisted choice has been read. The root layout holds the
   * splash screen until this flips so the app never paints light-then-dark.
   */
  isReady: boolean;
  /** Pick a mode explicitly (also persists it). */
  setMode: (mode: ThemeMode) => void;
  /**
   * Flip between light and dark, pinning the result. Never lands on `'system'` -
   * a deliberate tap means "I want this appearance", so it stops tracking the OS
   * until the user picks `'system'` again via {@link setMode}.
   */
  toggle: () => void;
};

const ThemePreferenceContext = createContext<ThemePreference | null>(null);

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  // `useColorScheme` reports `null` during static web prerender / before the OS
  // value is known; treat anything that isn't 'dark' as light.
  const systemScheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!cancelled && isThemeMode(stored)) {
          setModeState(stored);
        }
      })
      .catch(() => {
        // No stored preference (or storage unavailable) - stay on 'system'.
      })
      .finally(() => {
        if (!cancelled) setIsReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // Best effort - the in-memory choice still applies for this session.
    });
  }, []);

  const scheme: ColorScheme = mode === 'system' ? systemScheme : mode;

  const toggle = useCallback(() => {
    setMode(scheme === 'dark' ? 'light' : 'dark');
  }, [scheme, setMode]);

  const value = useMemo<ThemePreference>(
    () => ({ mode, scheme, isReady, setMode, toggle }),
    [mode, scheme, isReady, setMode, toggle],
  );

  return (
    <ThemePreferenceContext.Provider value={value}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference(): ThemePreference {
  const context = useContext(ThemePreferenceContext);
  if (!context) {
    throw new Error('useThemePreference must be used within a ThemePreferenceProvider');
  }
  return context;
}
