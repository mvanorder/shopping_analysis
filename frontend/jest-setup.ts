// Runs after the test framework is installed, before each test file.
//
// jest-expo already wires up most of the React Native mock surface. The two
// pieces it does not cover for this app are AsyncStorage (a native module that
// throws if touched without a mock) and react-native-reanimated (pulled in by
// react-native-paper's ripple), so both are mocked here once for every suite.

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
