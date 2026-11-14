
import { test, expect } from '@playwright/test';

import { EventsPage } from '../../pages/EventsPage';
import { BookingPage } from '../../pages/BookingPage';
import { MyBookingsPage } from '../../pages/MyBookingPage';
import { cancelTestBookings } from '../../utils/targetedBookingCleanup';
test.setTimeout(120000);

test(
  'TC_UI_07 - Verify inventory after cancelling five tickets',
  async ({ page }) => {

    // Initialize Page Objects
    const eventsPage = new EventsPage(page);
    const bookingPage = new BookingPage(page);
    const myBookingsPage = new MyBookingsPage(page);

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
    let bookingReference: string | undefined;
    let cancellationCompleted = false;

    try {

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

          console.log(
            `Seats before booking: ${seatsBefore}`
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

          bookingReference =
            await bookingPage.getBookingReference();

          expect(bookingReference).toMatch(
            /^[A-Z]-[A-Z0-9]+$/
          );

          console.log(
            `Created booking: ${bookingReference}`
          );
        }
      );

      // STEP 3 - Verify seats decreased by five
      await test.step(
        'Verify available seats decreased by five',
        async () => {

          const expectedSeats =
            seatsBefore - quantity;

          await expect.poll(
            async () => {

              await eventsPage.openEvents();

              return await eventsPage.getAvailableSeats(
                eventName
              );

            },
            {
              message: 'Available seats should decrease by 5',
              timeout: 45000,
              intervals: [1000, 2000]
            }
          ).toBe(expectedSeats);

          console.log(
            `Expected seats after booking: ${expectedSeats}`
          );
        }
      );

      // STEP 4 - Verify the booking in My Bookings
      await test.step(
        'Verify newly created booking',
        async () => {

          if (!bookingReference) {
            throw new Error(
              'Booking reference was not generated'
            );
          }

          await myBookingsPage.openMyBookings();

          await myBookingsPage.verifyBookingExists(
            bookingReference,
            eventName
          );
        }
      );

      
let seatsBeforeCancellation = 0;

// STEP 5 - Cancel the booking
await test.step(
  'Cancel the five-ticket booking',
  async () => {

    if (!bookingReference) {
      throw new Error('Missing booking reference');
    }

    // Capture inventory immediately before cancellation
    await eventsPage.openEvents();

    seatsBeforeCancellation =
      await eventsPage.getAvailableSeats(eventName);

    await myBookingsPage.openMyBookings();

    await myBookingsPage.cancelBooking(bookingReference);

    cancellationCompleted = true;

    console.log(`Booking cancelled: ${bookingReference}`);
  }
);

// STEP 6 - Verify seats restored
await test.step(
  'Verify five seats restored after cancellation',
  async () => {

    const expectedSeats =
      seatsBeforeCancellation + quantity;

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
    ).toBe(expectedSeats);

    console.log(
      `Seats before cancellation: ${seatsBeforeCancellation}`
    );

    console.log(
      `Expected seats after cancellation: ${expectedSeats}`
    );
  }
);

    } finally {

      // Cleanup if the test fails before cancellation
      if (bookingReference && !cancellationCompleted) {

        await test.step(
          'Cleanup booking after test failure',
          async () => {

            await cancelTestBookings(page, [bookingReference!]);
          }
        );
      }
    }
  }
);
