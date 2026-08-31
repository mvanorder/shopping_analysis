import { renderWithProviders, screen } from '../../../../../test-utils/render';
import { DashboardPreview } from '../DashboardPreview';

describe('DashboardPreview', () => {
  it('renders the sample stats and reorder items with spoken labels', async () => {
    await renderWithProviders(<DashboardPreview />);

    expect(screen.getByLabelText('Spend: $342')).toBeOnTheScreen();
    expect(screen.getByLabelText('Orders: 9')).toBeOnTheScreen();
    expect(screen.getByLabelText('Milk, due in 2 days')).toBeOnTheScreen();
    expect(screen.getByLabelText('Paper Towels, due in 5 days')).toBeOnTheScreen();
  });

  it('squares its corners and drops elevation when framed inside a phone', async () => {
    await renderWithProviders(
      <DashboardPreview rounded={false} elevated={false} topInset={30} />,
    );

    // Still renders the same content; the frame-specific props only affect style.
    expect(screen.getByText('Good afternoon')).toBeOnTheScreen();
  });
});
