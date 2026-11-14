
import { test, expect, Page } from '@playwright/test';

import { EventsPage } from '../../pages/EventsPage';
import { BookingPage } from '../../pages/BookingPage';
import { MyBookingsPage } from '../../pages/MyBookingPage';
import { cancelTestBookings } from '../../utils/targetedBookingCleanup';

// Shared test data
const EVENT_1 = 'Dilli Diwali Mela';
const EVENT_2 = 'Hollywood Monsoon Night';

const customerName = 'Automation Test User';
const customerPhone = '0106666666';

// Reusable booking operation
async function createBooking(
  page: Page,
  eventName: string,
  quantity: number,
  createdReferences: Set<string>
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
  createdReferences.add(reference); // Track before any assertions.
  expect(reference).toMatch(/^[A-Z]-[A-Z0-9]+$/);
  return reference;
}

test.describe('Multiple booking scenarios', () => {

  test.describe.configure({ mode: 'default' });

  // TC_UI_08
  test(
    'TC_UI_08 - Booking Multiple Events - two different events with unique references',
    async ({ page }) => {

      test.setTimeout(90000);

      const myBookingsPage = new MyBookingsPage(page);
      const bookingPage = new BookingPage(page);

      let reference1 = '';
      let reference2 = '';
      const createdReferences = new Set<string>();

      try {

      // STEP 1 - Book first event
      await test.step('Book Dilli Diwali Mela', async () => {
        reference1 = await createBooking(
          page,
          EVENT_1,
          1,
          createdReferences
        );
      });

      // STEP 2 - Book second event
      await test.step('Book Hollywood Monsoon Night',
        async () => {

          reference2 = await createBooking(
            page,
            EVENT_2,
            2,
            createdReferences
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

      } finally {
        await test.step('Cancel only TC_UI_08 bookings', async () => {
          await cancelTestBookings(page, createdReferences);
        });
      }
    }
  );

  // TC_UI_09
  test(
    'TC_UI_09 - Booking same event multiple times - verify limit of tickets and unique references',
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
      const createdReferences = new Set<string>();

      try {

      // STEP 1 - Create first booking
      await test.step('Book first 10 tickets', async () => {

        firstReference = await createBooking(
          page,
          eventName,
          quantity,
          createdReferences
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

          // A second confirmation is a test failure, but capture its
          // reference first so it can be cancelled in finally.
          await bookingPage.submitBooking();
          const confirmation = page.getByText('Booking Confirmed!', {
            exact: false
          });
          const limitError = page.getByText(
            /maximum.*tickets|ticket.*limit|already booked/i
          );
          await expect(
            confirmation.or(limitError).first()
          ).toBeVisible();
          if (await confirmation.isVisible()) {
            const unexpectedReference = await bookingPage.getBookingReference();
            createdReferences.add(unexpectedReference);
            console.log(`Unexpected second booking: ${unexpectedReference}`);
          }
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

          // Do not assert a global booking count: other account bookings
          // may exist, and must remain untouched by this test.
          const secondReference = [...createdReferences].find(
            reference => reference !== firstReference
          );
          expect(
            secondReference,
            'A second booking should not have been created'
          ).toBeUndefined();
        }
      );

      } finally {
        await test.step('Cancel only TC_UI_09 bookings', async () => {
          await cancelTestBookings(page, createdReferences);
        });
      }
    }
  );

});