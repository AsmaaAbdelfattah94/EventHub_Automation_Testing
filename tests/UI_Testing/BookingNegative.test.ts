
import { test, expect } from '@playwright/test';

import { EventsPage } from '../../pages/EventsPage';
import { BookingPage } from '../../pages/BookingPage';
import { MyBookingsPage } from '../../pages/MyBookingPage';
import { clearAllBookings } from '../../utils/bookingCleanup';


// Use a dedicated automation account: clears ALL bookings for that account.
test.afterEach(async ({ page }) => {
  await test.step('Clear all bookings after test', async () => {
    await clearAllBookings(page);
  });
});

// Negative tests assert an empty initial state; also reset leftover data
// from earlier failed runs before each case.
test.beforeEach(async ({ page }) => {
  await test.step('Reset test account before validation', async () => {
    await clearAllBookings(page);
  });
});

// Test data
const NegativeScenarios = [
  {
    id: 'TC_UI_03',
    description: 'Invalid email format',
    email: 'asmaa.mohamed.com',
    phone: '01066666666',
    expectedError: 'Enter a valid email'
  },
  {
    id: 'TC_UI_04',
    description: 'Alphabetic phone number',
    email: 'automation@example.com',
    phone: 'ssdfdfgfd',
    expectedError: 'Enter a valid 10-digit phone'
  },
  {
    id: 'TC_UI_05',
    description: 'Phone number with 9 digits - BVA',
    email: 'automation@example.com',
    phone: '123456789',
    expectedError: 'Enter a valid 10-digit phone'
  },
  {
    id: 'TC_UI_06',
    description: 'Phone number with 11 digits - BVA',
    email: 'automation@example.com',
    phone: '12345678901',
    expectedError: 'Enter a valid 10-digit phone'
  },
];

test.describe('Booking input validation', () => {

  for (const scenario of NegativeScenarios) {

    test(`${scenario.id} - ${scenario.description}`,
      async ({ page }) => {

        // Initialize Page Objects
        const eventsPage = new EventsPage(page);
        const bookingPage = new BookingPage(page);
        const myBookingsPage = new MyBookingsPage(page);

        const eventName = 'Dilli Diwali Mela';
        const customerName = 'Automation Test User';

        let bookingReference: string | undefined;
        let bookingAccepted = false;

        // STEP 1 - Verify initial account state
        await test.step('Verify My Bookings is empty',
          async () => {
            await myBookingsPage.openMyBookings();
            await myBookingsPage.verifyNoBookings();
          }
        );

        // STEP 2 - Open event
        await test.step('Select event', async () => {
          await eventsPage.openEvents();
          await eventsPage.selectEvent(eventName);
          await bookingPage.selectTicketQuantity(1);
        });

        // STEP 3 - Enter test data
        await test.step('Enter customer details', async () => {
          await bookingPage.enterCustomerDetails(
            customerName,
            scenario.email,
            scenario.phone
          );
        });

        try {
          // STEP 4 - Submit booking
          await test.step('Submit booking', async () => {
            await bookingPage.submitBooking();
          });

          // STEP 5 - Observe application response
          await test.step('Check validation outcome',
            async () => {

              const validationError = page.getByText(
                scenario.expectedError,
                { exact: true }
              );

              const confirmation = page.getByText(
                'Booking Confirmed!',
                { exact: false }
              );

              // Wait until validation or confirmation appears
              await expect(
                validationError.or(confirmation).first()
              ).toBeVisible();

              bookingAccepted =
                await confirmation.isVisible();

              if (bookingAccepted) {
                bookingReference =
                  await bookingPage.getBookingReference();

                console.log(
                  `${scenario.id}: Unexpected booking created: ${bookingReference}`
                );
              } else {
                await expect(validationError).toBeVisible();

                console.log(
                  `${scenario.id}: Validation correctly rejected input`
                );
              }
            }
          );

        } finally {
          // STEP 6 - Clean up if booking was created
          if (bookingReference) {
            await test.step('Clean up unexpected booking',
              async () => {
                await myBookingsPage.openMyBookings();
                await myBookingsPage.cancelBooking(
                  bookingReference!
                );
              }
            );
          }
        }

        // STEP 7 - Verify expected result
        await test.step('Verify invalid input was rejected',
          async () => {

            expect(
              bookingAccepted,
              `Booking was accepted for ${scenario.description}`
            ).toBe(false);

            await myBookingsPage.openMyBookings();
            await myBookingsPage.verifyNoBookings();
          }
        );

      }
    );
  }
});