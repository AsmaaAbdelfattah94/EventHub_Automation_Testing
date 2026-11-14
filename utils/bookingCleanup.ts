import { expect, type Page } from '@playwright/test';

/**
 * Destructive cleanup: clears every booking associated with the signed-in
 * account. Use ONLY with a dedicated automation account.
 *
 * EventHub's "Clear all bookings" action was recorded with a native dialog.
 * Adjust this helper if the application uses a custom confirmation modal.
 */
export async function clearAllBookings(page: Page): Promise<void> {
  // The /bookings route was observed in the page snapshot.
  await page.goto('/bookings');
  await expect(
    page.getByRole('heading', { name: 'My Bookings', exact: true })
  ).toBeVisible();

  const empty = page.getByRole('heading', {
    name: 'No bookings yet',
    exact: true
  });
  const cards = page.getByTestId('booking-card');

  // Wait for a rendered empty state or a booking card; avoid checking
  // count immediately while the list may still be loading.
  await expect(empty.or(cards.first())).toBeVisible({ timeout: 15000 });

  if (await empty.isVisible()) {
    await expect(cards).toHaveCount(0);
    return;
  }

  // Recordings show a native confirm dialog for this action.
  page.once('dialog', async dialog => {
    await dialog.accept();
  });

  await page.getByRole('button', { name: 'Clear all bookings' }).click();

  // Verify the application now reports an empty account.
  await expect(empty).toBeVisible({ timeout: 15000 });
  await expect(cards).toHaveCount(0);
}
