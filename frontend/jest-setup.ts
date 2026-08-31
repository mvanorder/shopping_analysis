// Runs after the test framework is installed, before each test file.
//
// jest-expo wires up most of the React Native mock surface; this file fills the
// gaps this app hits.
//
// jest.mock factories are hoisted above imports, so their bodies have to
// `require` - disable the lint rule for the whole file rather than every line.
/* eslint-disable @typescript-eslint/no-require-imports */

// React only routes state updates through `act()` when this global is set. RNTL
// sets it around its own render/fireEvent calls but restores the prior value
// afterwards - so async work that lands later (Paper animations, font loads)
// runs with it unset and React logs "not configured to support act(...)".
// jest-expo does not set it, so pin it on for the whole run.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// The real SafeAreaProvider only renders its children after an onLayout pass,
// which never fires under test. Its shipped mock supplies fixed inset values
// synchronously.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

// react-native-paper renders icons through
// @react-native-vector-icons/material-design-icons, whose real component kicks
// off an async font download via the Expo modules global on first mount. That
// global is absent under test, so it logs "Failed to load font". Swap it for a
// trivial text stand-in - no test inspects the glyph itself.
jest.mock('@react-native-vector-icons/material-design-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = ({ name, ...rest }: { name?: string }) =>
    React.createElement(Text, rest, name ?? null);
  return { __esModule: true, default: Icon, MaterialDesignIcons: Icon };
});
