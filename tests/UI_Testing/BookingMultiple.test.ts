
import { test, expect } from '../../fixtures/uiFixtures';

import { BOOKING_REF_PATTERN } from '../../utils/bookingReference';

import { EventsPage } from '../../pages/EventsPage';
import { BookingPage } from '../../pages/BookingPage';

// Shared test data
const EVENT_1 = 'Dilli Diwali Mela';
const EVENT_2 = 'Hollywood Monsoon Night';

const customerName = 'Automation Test User';
const customerPhone = '0106666666';

// Reusable booking operation; the reference is tracked for cleanup
// before any assertion runs.
async function createBooking(
  eventsPage: EventsPage,
  bookingPage: BookingPage,
  trackBooking: (reference: string) => void,
  eventName: string,
  quantity: number
): Promise<string> {

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
  trackBooking(reference);

  expect(reference).toMatch(BOOKING_REF_PATTERN);

  return reference;
}

test.describe('Multiple booking scenarios', () => {

  test.describe.configure({ mode: 'default' });

  // TC_UI_08
  test(
    'TC_UI_08 - Booking Multiple Events - two different events with unique references',
    async ({ eventsPage, bookingPage, myBookingsPage, trackBooking }) => {

      test.setTimeout(90000);

      let reference1 = '';
      let reference2 = '';

      // STEP 1 - Book first event
      await test.step('Book Dilli Diwali Mela', async () => {
        reference1 = await createBooking(
          eventsPage,
          bookingPage,
          trackBooking,
          EVENT_1,
          1
        );
      });

      // STEP 2 - Book second event
      await test.step('Book Hollywood Monsoon Night', async () => {
        reference2 = await createBooking(
          eventsPage,
          bookingPage,
          trackBooking,
          EVENT_2,
          2
        );
      });

      // STEP 3 - Verify booking references
      await test.step('Verify unique booking references', async () => {
        expect(reference1).not.toBe(reference2);
      });

      // STEP 4 - Verify My Bookings
      await test.step('Verify both events in My Bookings', async () => {

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
      });

      // Both bookings are cancelled by the trackBooking fixture.
    }
  );

  // TC_UI_09
  test(
    'TC_UI_09 - Booking same event multiple times - verify limit of tickets and unique references',
    {
      annotation: {
        type: 'open-question',
        description:
          'The API docs limit quantity to 1-10 per request only. Is the 10-ticket maximum cumulative per user/event? See README: Story / documentation / application mismatches.'
      }
    },
    async ({ page, eventsPage, bookingPage, myBookingsPage, trackBooking }) => {

      test.setTimeout(90000);

      const eventName = EVENT_2;
      const quantity = 10;

      const email = process.env.TEST_EMAIL;

      if (!email) {
        throw new Error('TEST_EMAIL is missing');
      }

      let firstReference = '';
      let secondReference: string | undefined;

      // STEP 1 - Create first booking
      await test.step('Book first 10 tickets', async () => {
        firstReference = await createBooking(
          eventsPage,
          bookingPage,
          trackBooking,
          eventName,
          quantity
        );
      });

      // STEP 2 - Verify first booking
      await test.step('Verify first booking in My Bookings', async () => {

        await bookingPage.openMyBookings();

        await myBookingsPage.verifyBookingExists(
          firstReference,
          eventName
        );
      });

      // STEP 3 - Attempt a second booking
      await test.step('Attempt another 10-ticket booking', async () => {

        await eventsPage.openEvents();
        await eventsPage.selectEvent(eventName);

        await bookingPage.selectTicketQuantity(quantity);

        await bookingPage.enterCustomerDetails(
          customerName,
          email,
          customerPhone
        );

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

        // A second confirmation is a test failure, but track its
        // reference first so the fixture cancels it.
        if (await confirmation.isVisible()) {
          secondReference = await bookingPage.getBookingReference();
          trackBooking(secondReference);
        }
      });

      // STEP 4 - Verify maximum-limit error
      // Marked as an expected failure only from here, so any failure in
      // steps 1-3 is still reported as a real regression.
      test.fail(
        true,
        'Open question for the PO: the second 10-ticket booking is accepted'
      );

      await test.step('Verify booking limit validation', async () => {

        // Assumption: the wording of the booking-limit error message.
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
      });

      // STEP 5 - Verify first booking is still present
      await test.step('Verify only the original booking exists', async () => {

        await myBookingsPage.openMyBookings();

        await myBookingsPage.verifyBookingExists(
          firstReference,
          eventName
        );

        // Do not assert a global booking count: other account bookings
        // may exist, and must remain untouched by this test.
        expect(
          secondReference,
          'A second booking should not have been created'
        ).toBeUndefined();
      });

      // All bookings created here are cancelled by the trackBooking fixture.
    }
  );

});
