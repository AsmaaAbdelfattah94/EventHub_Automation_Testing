import { Page } from '@playwright/test';
import { MyBookingsPage } from '../pages/MyBookingPage';

/** Cancel only bookings whose references this test explicitly registered. */
export async function cancelTestBookings(
  page: Page,
  references: Iterable<string>
): Promise<void> {
  const uniqueReferences = [...new Set(references)].filter(Boolean);
  if (uniqueReferences.length === 0) return;

  const myBookingsPage = new MyBookingsPage(page);
  await myBookingsPage.openMyBookings();

  const errors: string[] = [];
  for (const reference of uniqueReferences) {
    try {
      const card = myBookingsPage.getBookingCard(reference);
      const count = await card.count();
      if (count === 0) continue; // Already cancelled or absent.
      if (count !== 1) throw new Error(`Expected one card, found ${count}`);

      const cancelButton = card.getByTestId('cancel-booking-btn');
      if (!(await cancelButton.isVisible())) continue; // Already cancelled.

      await myBookingsPage.cancelBooking(reference);
      console.log(`Cleaned up test booking: ${reference}`);
    } catch (error) {
      errors.push(`${reference}: ${String(error)}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Targeted booking cleanup failed:\n${errors.join('\n')}`);
  }
}
