import { Text } from 'react-native';

import { renderWithProviders, screen } from '../../../../../test-utils/render';
import { setViewport, resetViewport } from '../../../../../test-utils/viewport';
import { Section } from '../Section';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions');

afterEach(resetViewport);

describe('Section', () => {
  it('renders content inside a full-bleed background band at expanded width', async () => {
    setViewport(1280);
    await renderWithProviders(
      <Section background="#ffffff" density={1.5} onLayout={jest.fn()}>
        <Text>section body</Text>
      </Section>,
    );

    expect(screen.getByText('section body')).toBeOnTheScreen();
  });

  it('defaults to a transparent band and unit density on a compact viewport', async () => {
    setViewport(375);
    await renderWithProviders(
      <Section>
        <Text>plain section</Text>
      </Section>,
    );

    expect(screen.getByText('plain section')).toBeOnTheScreen();
  });
});
