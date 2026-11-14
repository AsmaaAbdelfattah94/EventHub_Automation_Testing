
import { test, expect } from '../../fixtures/uiFixtures';

import { BOOKING_REF_PATTERN } from '../../utils/bookingReference';

test.setTimeout(120000);

test(
  'TC_UI_07 - Verify inventory after cancelling five tickets',
  async ({ eventsPage, bookingPage, myBookingsPage, trackBooking }) => {

    // Test data
    const eventName = 'Hollywood Monsoon Night';
    const quantity = 5;
    const customerName = 'Automation Test User';
    const customerEmail = process.env.TEST_EMAIL;
    const customerPhone = '0111111111';

    if (!customerEmail) {
      throw new Error('TEST_EMAIL is missing');
    }

    // Test variables
    let seatsBefore = 0;
    let seatsBeforeCancellation = 0;
    let bookingReference = '';

    // STEP 1 - Capture available seats before booking
    await test.step(
      'Capture seats before booking',
      async () => {

        await eventsPage.openEvents();

        seatsBefore =
          await eventsPage.getAvailableSeats(eventName);

        expect(seatsBefore).toBeGreaterThanOrEqual(
          quantity
        );
      }
    );

    // STEP 2 - Book five tickets
    await test.step(
      'Create booking for five tickets',
      async () => {

        await eventsPage.selectEvent(eventName);

        await bookingPage.selectTicketQuantity(
          quantity
        );

        const summary =
          await bookingPage.getTicketSummary();

        expect(summary.quantity).toBe(quantity);

        await bookingPage.enterCustomerDetails(
          customerName,
          customerEmail,
          customerPhone
        );

        await bookingPage.confirmBooking();

        // Track for cleanup in case a later step fails before
        // the booking is cancelled.
        bookingReference =
          await bookingPage.getBookingReference();

        trackBooking(bookingReference);

        expect(bookingReference).toMatch(
          BOOKING_REF_PATTERN
        );
      }
    );

    // STEP 3 - Verify seats decreased by five
    await test.step(
      'Verify available seats decreased by five',
      async () => {

        await expect.poll(
          async () => {

            await eventsPage.openEvents();

            return eventsPage.getAvailableSeats(eventName);
          },
          {
            message: 'Available seats should decrease by 5',
            timeout: 45000,
            intervals: [1000, 2000]
          }
        ).toBe(seatsBefore - quantity);
      }
    );

    // STEP 4 - Verify the booking in My Bookings
    await test.step(
      'Verify newly created booking',
      async () => {

        await myBookingsPage.openMyBookings();

        await myBookingsPage.verifyBookingExists(
          bookingReference,
          eventName
        );
      }
    );

    // STEP 5 - Cancel the booking
    await test.step(
      'Cancel the five-ticket booking',
      async () => {

        // Capture inventory immediately before cancellation
        await eventsPage.openEvents();

        seatsBeforeCancellation =
          await eventsPage.getAvailableSeats(eventName);

        await myBookingsPage.openMyBookings();

        await myBookingsPage.cancelBooking(bookingReference);
      }
    );

    // STEP 6 - Verify the cancelled booking is gone from My Bookings (AC4)
    await test.step(
      'Verify cancelled booking is removed from My Bookings',
      async () => {

        await myBookingsPage.verifyBookingRemoved(bookingReference);
      }
    );

    // STEP 7 - Verify seats restored
    await test.step(
      'Verify five seats restored after cancellation',
      async () => {

        await expect.poll(
          async () => {

            await eventsPage.openEvents();

            return eventsPage.getAvailableSeats(eventName);
          },
          {
            message: 'Cancellation should restore five seats',
            timeout: 45000,
            intervals: [1000, 2000]
          }
        ).toBe(seatsBeforeCancellation + quantity);
      }
    );

    // If a step fails before STEP 5, the trackBooking fixture cancels the
    // booking. After STEP 5 the cleanup finds it already gone and skips it.
  }
);
