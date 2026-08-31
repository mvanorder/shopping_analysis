import { Platform } from 'react-native';

import { heading } from '../a11y';

describe('heading()', () => {
  const original = Platform.OS;
  afterEach(() => {
    Platform.OS = original;
  });

  it('marks the element as a header role on native without aria-level', () => {
    Platform.OS = 'ios';
    expect(heading(2)).toEqual({ accessibilityRole: 'header' });
  });

  it('adds aria-level on web so react-native-web emits h2/h3 not another h1', () => {
    Platform.OS = 'web';
    expect(heading(3)).toEqual({
      accessibilityRole: 'header',
      'aria-level': 3,
    });
  });
});
