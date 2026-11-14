
import { test, expect, Page } from '@playwright/test';

import { EventsPage } from '../../pages/EventsPage';
import { BookingPage } from '../../pages/BookingPage';
import { MyBookingsPage } from '../../pages/MyBookingPage';
import { clearAllBookings } from '../../utils/bookingCleanup';

// Shared test data
const EVENT_1 = 'Dilli Diwali Mela';
const EVENT_2 = 'Hollywood Monsoon Night';

const customerName = 'Automation Test User';
const customerPhone = '01066666666';

// Reusable booking operation
async function createBooking(
  page: Page,
  eventName: string,
  quantity: number
): Promise<string> {

  const eventsPage = new EventsPage(page);
  const bookingPage = new BookingPage(page);

  const email = process.env.TEST_EMAIL;

  if (!email) {
    throw new Error('TEST_EMAIL is missing');
  }

  await eventsPage.openEvents();
  await eventsPage.selectEvent(eventName);

  await bookingPage.selectTicketQuantity(quantity);

  await bookingPage.enterCustomerDetails(
    customerName,
    email,
    customerPhone
  );

  await bookingPage.confirmBooking();

  const reference = await bookingPage.getBookingReference();

  expect(reference).toMatch(/^[A-Z]-[A-Z0-9]+$/);

  return reference;
}

test.describe('Multiple booking scenarios', () => {

  test.describe.configure({ mode: 'default' });

  // Cleanup is restricted to a dedicated test account
  test.afterEach(async ({ page }) => {
    await test.step('Clear test account bookings', async () => {
      await clearAllBookings(page);
    });
  });

  // TC_UI_08
  test(
    'TC_UI_08 - Prevent booking beyond maximum limit',
    async ({ page }) => {

      test.setTimeout(90000);

      const myBookingsPage = new MyBookingsPage(page);
      const bookingPage = new BookingPage(page);

      let reference1 = '';
      let reference2 = '';

      // STEP 1 - Book first event
      await test.step('Book Dilli Diwali Mela', async () => {
        reference1 = await createBooking(
          page,
          EVENT_1,
          1
        );
      });

      // STEP 2 - Book second event
      await test.step('Book Hollywood Monsoon Night',
        async () => {

          reference2 = await createBooking(
            page,
            EVENT_2,
            2
          );
        }
      );

      // STEP 3 - Verify booking references
      await test.step('Verify unique booking references',
        async () => {

          expect(reference1).not.toBe(reference2);
        }
      );

      // STEP 4 - Verify My Bookings
      await test.step('Verify both events in My Bookings',
        async () => {

          await bookingPage.openMyBookings();

          await myBookingsPage.verifyBookingExists(
            reference1,
            EVENT_1
          );

          await myBookingsPage.verifyBookingExists(
            reference2,
            EVENT_2
          );

          // Both bookings must exist independently
          await expect(
            myBookingsPage.getBookingCard(reference1)
          ).toHaveCount(1);

          await expect(
            myBookingsPage.getBookingCard(reference2)
          ).toHaveCount(1);
        }
      );

    }
  );

  // TC_UI_09
  test(
    'TC_UI_09 - Prevent booking beyond maximum limit',
    async ({ page }) => {

      test.setTimeout(90000);

      const eventsPage = new EventsPage(page);
      const bookingPage = new BookingPage(page);
      const myBookingsPage = new MyBookingsPage(page);

      const eventName = EVENT_2;
      const quantity = 10;

      const email = process.env.TEST_EMAIL;

      if (!email) {
        throw new Error('TEST_EMAIL is missing');
      }

      let firstReference = '';

      // STEP 1 - Create first booking
      await test.step('Book first 10 tickets', async () => {

        firstReference = await createBooking(
          page,
          eventName,
          quantity
        );
      });

      // STEP 2 - Verify first booking
      await test.step('Verify first booking in My Bookings',
        async () => {

          await bookingPage.openMyBookings();

          await myBookingsPage.verifyBookingExists(
            firstReference,
            eventName
          );
        }
      );

      // STEP 3 - Attempt a second booking
      await test.step('Attempt another 10-ticket booking',
        async () => {

          await eventsPage.openEvents();
          await eventsPage.selectEvent(eventName);

          await bookingPage.selectTicketQuantity(quantity);

          await bookingPage.enterCustomerDetails(
            customerName,
            email,
            customerPhone
          );

          // Submit only; success is NOT expected
          await bookingPage.submitBooking();
        }
      );

      // STEP 4 - Verify maximum-limit error
      await test.step('Verify booking limit validation',
        async () => {

          
          // assumption: The error message for exceeding the booking limit.
          const limitError = page.getByText(
            /maximum.*tickets|ticket.*limit|already booked/i
          );

          await expect(limitError).toBeVisible();

          // A second successful confirmation must not appear
          await expect(
            page.getByText('Booking Confirmed!', {
              exact: false
            })
          ).not.toBeVisible();
        }
      );

      // STEP 5 - Verify first booking is still present
      await test.step('Verify only the original booking exists',
        async () => {

          await myBookingsPage.openMyBookings();

          await myBookingsPage.verifyBookingExists(
            firstReference,
            eventName
          );

          // This assumes the dedicated test account
          // started with no other bookings for the event.
          const eventBookings = page.getByTestId(
            'booking-card'
          ).filter({ hasText: eventName });

          await expect(eventBookings).toHaveCount(1);
        }
      );

    }
  );

});