
import { test, expect } from '../../fixtures/uiFixtures';


// Test data
// `name` defaults to a valid customer name when not set.
// Every message in `expectedErrors` must be shown for the scenario to pass.
const NegativeScenarios = [
  {
    id: 'TC_UI_03',
    description: 'Invalid email format',
    email: 'asmaa.mohamed.com',
    phone: '01066666666',
    expectedErrors: ['Enter a valid email']
  },
  {
    id: 'TC_UI_04',
    description: 'Alphabetic phone number',
    email: 'automation@example.com',
    phone: 'ssdfdfgfd',
    expectedErrors: ['Enter a valid 10-digit phone']
  },
  {
    id: 'TC_UI_05',
    description: 'Phone number with 9 digits - BVA',
    email: 'automation@example.com',
    phone: '123456789',
    expectedErrors: ['Enter a valid 10-digit phone']
  },
  {
    id: 'TC_UI_06',
    description: 'Phone number with 11 digits - BVA',
    email: 'automation@example.com',
    phone: '12345678901',
    expectedErrors: ['Enter a valid 10-digit phone'],
    openQuestion:
      'The UI says "Enter a valid 10-digit phone" but accepts 11 digits and +91-9876543210; the API only requires minLength 10. What is the actual phone rule? See README: Story / documentation / application mismatches.'
  },
  {
    id: 'TC_UI_10',
    description: 'Customer name with 1 character - BVA',
    name: 'A',
    email: 'automation@example.com',
    phone: '0106666666',
    expectedErrors: ['Name must be at least 2 chars']
  },
  {
    id: 'TC_UI_11',
    description: 'All required fields empty',
    name: '',
    email: '',
    phone: '',
    expectedErrors: [
      'Name must be at least 2 chars',
      'Enter a valid email',
      'Enter a valid 10-digit phone'
    ]
  },
];

test.describe('Booking input validation', () => {

  for (const scenario of NegativeScenarios) {

    test(`${scenario.id} - ${scenario.description}`,
      scenario.openQuestion
        ? { annotation: { type: 'open-question', description: scenario.openQuestion } }
        : {},
      async ({ page, eventsPage, bookingPage, trackBooking }) => {

        test.skip(
          !!scenario.openQuestion,
          scenario.openQuestion ?? 'PO clarification pending'
        );

        const eventName = 'Dilli Diwali Mela';
        const customerName = 'Automation Test User';

        let bookingAccepted = false;

        // STEP 1 - Open event
        await test.step('Select event', async () => {
          await eventsPage.openEvents();
          await eventsPage.selectEvent(eventName);
          await bookingPage.selectTicketQuantity(1);
        });

        // STEP 2 - Enter test data
        await test.step('Enter customer details', async () => {
          await bookingPage.enterCustomerDetails(
            scenario.name ?? customerName,
            scenario.email,
            scenario.phone
          );
        });

        // STEP 3 - Submit booking
        await test.step('Submit booking', async () => {
          await bookingPage.submitBooking();
        });

        // STEP 4 - Observe application response
        await test.step('Check validation outcome',
          async () => {

            const validationErrors = scenario.expectedErrors.map(
              message => page.getByText(message, { exact: true })
            );

            const confirmation = page.getByText(
              'Booking Confirmed!',
              { exact: false }
            );

            // Wait until validation or confirmation appears
            await expect(
              validationErrors[0].or(confirmation).first()
            ).toBeVisible();

            bookingAccepted =
              await confirmation.isVisible();

            if (bookingAccepted) {
              // Unexpected booking: track it so the fixture cancels it.
              trackBooking(await bookingPage.getBookingReference());
            } else {
              for (const validationError of validationErrors) {
                await expect(validationError).toBeVisible();
              }
            }
          }
        );

        // STEP 5 - Verify expected result (executed only for confirmed requirements).

        await test.step('Verify invalid input was rejected',
          async () => {

            expect(
              bookingAccepted,
              `Booking was accepted for ${scenario.description}`
            ).toBe(false);
          }
        );
      }
    );
  }

  // TC_UI_12 - Lower boundary of the name rule (pairs with TC_UI_10)
  test('TC_UI_12 - Customer name with 2 characters is accepted - BVA',
    async ({ eventsPage, bookingPage, trackBooking }) => {

      await test.step('Select event', async () => {
        await eventsPage.openEvents();
        await eventsPage.selectEvent('Dilli Diwali Mela');
        await bookingPage.selectTicketQuantity(1);
      });

      await test.step('Enter a 2-character name with valid email and phone',
        async () => {
          await bookingPage.enterCustomerDetails(
            'Al',
            'automation@example.com',
            '0106666666'
          );
        }
      );

      await test.step('Verify the booking is confirmed', async () => {
        await bookingPage.confirmBooking();
        trackBooking(await bookingPage.getBookingReference());
      });

      // The booking is cancelled by the trackBooking fixture.
    }
  );
});