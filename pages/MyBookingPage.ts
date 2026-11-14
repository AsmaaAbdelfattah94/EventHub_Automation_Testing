
import { Page, expect } from '@playwright/test';

export class MyBookingsPage {

  constructor(private readonly page: Page) {}

  // Navigate to My Bookings
  async openMyBookings() {

    await this.page.goto('/');

    await this.page.getByTestId('nav-bookings').click();

    await expect(
      this.page.getByRole('heading', {
        name: 'My Bookings'
      }).first()
    ).toBeVisible();

    // The heading renders before the list. Wait until either a booking
    // card or the empty state is shown, so card counts are reliable.
    await expect(
      this.page.getByTestId('booking-card').first()
        .or(this.page.getByRole('heading', {
          name: 'No bookings yet',
          exact: true
        }))
    ).toBeVisible();
  }

  // Locate booking using its unique reference
  getBookingCard(reference: string) {

    return this.page.getByTestId('booking-card')
      .filter({ hasText: reference });
  }

  // Verify a booking exists and is confirmed
  async verifyBookingExists(
    reference: string,
    eventName: string
  ) {

    const bookingCard = this.getBookingCard(reference);

    await expect(bookingCard).toHaveCount(1);

    await expect(bookingCard).toContainText(reference);

    await expect(bookingCard).toContainText(eventName);

    await expect(
      bookingCard.getByText('confirmed', {
        exact: true
      })
    ).toBeVisible();
  }

  // Open details of a specific booking
  async openBookingDetails(reference: string) {

    const bookingCard = this.getBookingCard(reference);

    await expect(bookingCard).toHaveCount(1);

    await bookingCard.getByRole('button', {
      name: 'View Details'
    }).click();
  }

  // Cancel only the specified booking
  async cancelBooking(reference: string) {

    const bookingCard = this.getBookingCard(reference);

    await expect(bookingCard).toHaveCount(1);

    const cancelButton = bookingCard.getByTestId(
      'cancel-booking-btn'
    );

    await cancelButton.click();

    // Confirm cancellation
    await this.page.getByTestId(
      'confirm-dialog-yes'
    ).click();

    // Verify cancellation notification
    await expect(
      this.page.getByText('Booking cancelled', {
        exact: false
      })
    ).toBeVisible();
  }

  // Verify a cancelled booking is no longer listed, before and after reload
  async verifyBookingRemoved(reference: string) {

    await expect(this.getBookingCard(reference)).toHaveCount(0);

    await this.openMyBookings();

    await expect(this.getBookingCard(reference)).toHaveCount(0);
  }

  // Verify the My Bookings page is empty
  async verifyNoBookings() {

    await expect(
      this.page.getByRole('heading', {
        name: 'No bookings yet',
        exact: true
      })
    ).toBeVisible();

    await expect(
      this.page.getByTestId('booking-card')
    ).toHaveCount(0);
  }
}
