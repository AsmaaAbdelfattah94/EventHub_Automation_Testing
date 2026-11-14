
import {
  request as playwrightRequest
} from '@playwright/test';

import { test, expect } from '../../fixtures/apiFixtures';

import {
  CreateBookingRequest
} from '../../api/models/BookingModels';

// =====================================================
// SHARED TEST DATA
// =====================================================

const validBookingData: CreateBookingRequest = {
  eventId: 285,
  customerName: 'API Automation Test',
  customerEmail: 'api.test@example.com',
  customerPhone: '+919876543210',
  quantity: 2
};

const quantityValidationMessage =
  'Quantity must be an integer between 1 and 10';

const nameValidationMessage =
  'Customer name must be at least 2 characters';

const emailValidationMessage =
  'Customer email must be a valid email address';

const phoneValidationMessage =
  'Customer phone must be at least 10 digits';

// Message returned for each missing required field
const requiredFieldMessages = [
  { field: 'eventId', message: 'Event ID is required' },
  { field: 'customerName', message: 'Customer name is required' },
  { field: 'customerEmail', message: 'Customer email is required' },
  { field: 'customerPhone', message: 'Customer phone is required' },
  { field: 'quantity', message: 'Quantity is required' }
];

test.describe('Booking API - Negative Scenarios', () => {

  // =====================================================
  // TC_API_02 - Zero ticket quantity
  // =====================================================

  test(
    'TC_API_02 - Reject booking with zero quantity',
    async ({ bookingApi, eventsApi }) => {

      const event = await test.step(
        'Retrieve available event',
        async () => eventsApi.getAvailableEvent(1)
      );

      const response = await test.step(
        'Attempt booking with zero tickets',
        async () => bookingApi.createBooking({
          ...validBookingData,
          eventId: event.id,
          quantity: 0
        })
      );

      await test.step(
        'Verify quantity validation error',
        async () => {

          const body = await response.json();

          expect(
            response.status(),
            JSON.stringify(body)
          ).toBe(400);

          expect(body.success).toBe(false);
          expect(body.error).toBe('Validation failed');

          expect(body.details).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                field: 'quantity',
                message: quantityValidationMessage
              })
            ])
          );
        }
      );
    }
  );

  // =====================================================
  // TC_API_03 - Nonexistent event
  // =====================================================

  test(
    'TC_API_03 - Reject booking with nonexistent event',
    async ({ bookingApi }) => {

      const nonexistentEventId = 2147483647;

      const response = await test.step(
        'Attempt booking for nonexistent event',
        async () => bookingApi.createBooking({
          ...validBookingData,
          eventId: nonexistentEventId
        })
      );

      await test.step(
        'Verify event not found response',
        async () => {

          const body = await response.json();

          expect(
            response.status(),
            JSON.stringify(body)
          ).toBe(404);

          expect(body.success).toBe(false);

          // The exact message proves the 404 is caused by the missing
          // event, not by something else such as a wrong URL.
          expect(body.error).toBe(
            `Event with id ${nonexistentEventId} not found`
          );
        }
      );
    }
  );

  // =====================================================
  // TC_API_04 - Missing authentication
  // =====================================================

  test(
    'TC_API_04 - Reject booking without authentication',
    async () => {

      const baseURL = process.env.API_BASE_URL;

      if (!baseURL) {
        throw new Error('API_BASE_URL is missing');
      }

      // This context intentionally has no auth token.
      const unauthenticatedRequest =
        await playwrightRequest.newContext({
          baseURL,
          ignoreHTTPSErrors:
            process.env.API_IGNORE_HTTPS_ERRORS === 'true'
        });

      try {
        const response = await test.step(
          'Submit booking without authentication',
          async () => unauthenticatedRequest.post(
            'bookings',
            {
              data: validBookingData,
              timeout: 30000
            }
          )
        );

        await test.step(
          'Verify unauthorized response',
          async () => {

            const body = await response.json();

            expect(
              response.status(),
              JSON.stringify(body)
            ).toBe(401);

            expect(body.success).toBe(false);
          }
        );

      } finally {
        await unauthenticatedRequest.dispose();
      }
    }
  );

  // =====================================================
  // TC_API_08 - Maximum quantity boundary (11 tickets)
  // =====================================================

  test(
    'TC_API_08 - Reject single booking exceeding 10 tickets',
    async ({ bookingApi, eventsApi }) => {

      const event = await test.step(
        'Retrieve event with at least 11 seats',
        async () => eventsApi.getAvailableEvent(11)
      );

      const bookingData: CreateBookingRequest = {
        ...validBookingData,
        eventId: event.id,
        customerName: `API BVA ${Date.now()}`,
        quantity: 11
      };

      const response = await test.step(
        'Attempt booking with 11 tickets',
        async () => bookingApi.createBooking(bookingData)
      );

      await test.step(
        'Verify maximum quantity validation',
        async () => {

          const body = await response.json();

          expect(
            response.status(),
            JSON.stringify(body)
          ).toBe(400);

          expect(body.success).toBe(false);
          expect(body.error).toBe('Validation failed');

          expect(body.details).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                field: 'quantity',
                message: quantityValidationMessage
              })
            ])
          );
        }
      );
    }
  );

  // =====================================================
  // TC_API_09 - Insufficient available seats
  // =====================================================

  test(
    'TC_API_09 - Reject booking exceeding available seats',
    async ({ bookingApi, eventsApi }) => {

      // STEP 1 - Find an event with 1-9 available seats
      const event = await test.step(
        'Retrieve event with fewer than 10 available seats',
        async () => {

          const selectedEvent =
            await eventsApi.getEventWithLimitedSeats(9);

          expect(
            selectedEvent.availableSeats
          ).toBeGreaterThan(0);

          expect(
            selectedEvent.availableSeats
          ).toBeLessThan(10);

          return selectedEvent;
        }
      );

      // STEP 2 - Prepare a request for 10 tickets
      const bookingData: CreateBookingRequest = {
        ...validBookingData,
        eventId: event.id,
        customerName:
          `API Insufficient Seats ${Date.now()}`,
        quantity: 10
      };

      // STEP 3 - Submit booking
      const response = await test.step(
        'Attempt booking exceeding available seats',
        async () => bookingApi.createBooking(bookingData)
      );

      // STEP 4 - Verify exact error response
      await test.step(
        'Verify HTTP 400 and insufficient seats error',
        async () => {

          const body = await response.json();

          expect(
            response.status(),
            `Unexpected response: ${JSON.stringify(body)}`
          ).toBe(400);

          expect(body.success).toBe(false);

          const expectedError =
            `Only ${event.availableSeats} seat(s) available, but 10 requested`;

          expect(
            body.error,
            'API should report insufficient available seats'
          ).toBe(expectedError);
        }
      );

      // If a booking is unexpectedly created with HTTP 201,
      // the API fixture tracks and cancels it.
    }
  );

  // =====================================================
  // TC_API_10 - Customer name shorter than 2 characters
  // =====================================================

  test(
    'TC_API_10 - Reject booking with customer name shorter than 2 characters',
    async ({ bookingApi, eventsApi }) => {

      const event = await test.step(
        'Retrieve available event',
        async () => eventsApi.getAvailableEvent(2)
      );

      const bookingData: CreateBookingRequest = {
        ...validBookingData,
        eventId: event.id,
        customerName: 'A'
      };

      const response = await test.step(
        'Attempt booking with a 1-character name',
        async () => bookingApi.createBooking(bookingData)
      );

      await test.step(
        'Verify customer name validation error',
        async () => {

          const body = await response.json();

          expect(
            response.status(),
            JSON.stringify(body)
          ).toBe(400);

          expect(body.success).toBe(false);
          expect(body.error).toBe('Validation failed');

          expect(body.details).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                field: 'customerName',
                message: nameValidationMessage
              })
            ])
          );
        }
      );
    }
  );

  // =====================================================
  // TC_API_11 - Invalid customer email
  // =====================================================

  test(
    'TC_API_11 - Reject booking with invalid customer email',
    async ({ bookingApi, eventsApi }) => {

      const event = await test.step(
        'Retrieve available event',
        async () => eventsApi.getAvailableEvent(2)
      );

      const bookingData: CreateBookingRequest = {
        ...validBookingData,
        eventId: event.id,
        customerName: `API Invalid Email ${Date.now()}`,
        customerEmail: 'not-an-email'
      };

      const response = await test.step(
        'Attempt booking with an invalid email',
        async () => bookingApi.createBooking(bookingData)
      );

      await test.step(
        'Verify customer email validation error',
        async () => {

          const body = await response.json();

          expect(
            response.status(),
            JSON.stringify(body)
          ).toBe(400);

          expect(body.success).toBe(false);
          expect(body.error).toBe('Validation failed');

          expect(body.details).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                field: 'customerEmail',
                message: emailValidationMessage
              })
            ])
          );
        }
      );
    }
  );

  // =====================================================
  // TC_API_12 - Customer phone too short (3 digits)
  // =====================================================

  test(
    'TC_API_12 - Reject booking with customer phone too short (3 digits)',
    async ({ bookingApi, eventsApi }) => {

      const event = await test.step(
        'Retrieve available event',
        async () => eventsApi.getAvailableEvent(2)
      );

      const bookingData: CreateBookingRequest = {
        ...validBookingData,
        eventId: event.id,
        customerName: `API Short Phone ${Date.now()}`,
        customerPhone: '123'
      };

      const response = await test.step(
        'Attempt booking with a 3-digit phone',
        async () => bookingApi.createBooking(bookingData)
      );

      await test.step(
        'Verify customer phone validation error',
        async () => {

          const body = await response.json();

          expect(
            response.status(),
            JSON.stringify(body)
          ).toBe(400);

          expect(body.success).toBe(false);
          expect(body.error).toBe('Validation failed');

          expect(body.details).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                field: 'customerPhone',
                message: phoneValidationMessage
              })
            ])
          );
        }
      );
    }
  );

  // =====================================================
  // TC_API_13 - Customer phone too long (20 digits)
  // =====================================================

  test(
    'TC_API_13 - Reject booking with customer phone too long (20 digits)',
    {
      annotation: {
        type: 'open-question',
        description:
          'The API docs only set customerPhone minLength 10 (no maximum) and a 20-digit phone is accepted, while the UI says "10-digit phone". What is the actual phone rule? See README: Story / documentation / application mismatches.'
      }
    },
    async ({ bookingApi, eventsApi }) => {

      test.skip(true, 'PO clarification pending: maximum allowed phone number length');

      const event = await test.step(
        'Retrieve available event',
        async () => eventsApi.getAvailableEvent(2)
      );

      const bookingData: CreateBookingRequest = {
        ...validBookingData,
        eventId: event.id,
        customerName: `API Long Phone ${Date.now()}`,
        customerPhone: '12345678901234567890'
      };

      const response = await test.step(
        'Attempt booking with a 20-digit phone',
        async () => bookingApi.createBooking(bookingData)
      );

      // Pending PO confirmation: do not enforce a maximum length yet.

      await test.step(
        'Verify customer phone validation error',
        async () => {

          const body = await response.json();

          expect(
            response.status(),
            JSON.stringify(body)
          ).toBe(400);

          expect(body.success).toBe(false);
          expect(body.error).toBe('Validation failed');

          // No maximum is documented, so there is no message to
          // compare yet; only the rejected field is checked.
          expect(body.details).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                field: 'customerPhone'
              })
            ])
          );
        }
      );

      // The booking created by the API is tracked and
      // cancelled by the API fixture.
    }
  );

  // =====================================================
  // TC_API_14 - Non-integer quantity (1.5)
  // =====================================================

  test(
    'TC_API_14 - Reject booking with non-integer quantity (1.5)',
    async ({ bookingApi, eventsApi }) => {

      const event = await test.step(
        'Retrieve available event',
        async () => eventsApi.getAvailableEvent(2)
      );

      const bookingData: CreateBookingRequest = {
        ...validBookingData,
        eventId: event.id,
        customerName: `API Decimal Quantity ${Date.now()}`,
        quantity: 1.5
      };

      const response = await test.step(
        'Attempt booking with 1.5 tickets',
        async () => bookingApi.createBooking(bookingData)
      );

      await test.step(
        'Verify quantity validation error',
        async () => {

          const body = await response.json();

          expect(
            response.status(),
            JSON.stringify(body)
          ).toBe(400);

          expect(body.success).toBe(false);
          expect(body.error).toBe('Validation failed');

          expect(body.details).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                field: 'quantity',
                message: quantityValidationMessage
              })
            ])
          );
        }
      );
    }
  );

  // =====================================================
  // TC_API_15 - All required fields missing
  // =====================================================

  test(
    'TC_API_15 - Reject booking with all required fields missing',
    async ({ bookingApi }) => {

      const response = await test.step(
        'Submit booking with an empty body',
        async () => bookingApi.createBooking(
          {} as CreateBookingRequest
        )
      );

      await test.step(
        'Verify a required-field error for every field',
        async () => {

          const body = await response.json();

          expect(
            response.status(),
            JSON.stringify(body)
          ).toBe(400);

          expect(body.success).toBe(false);
          expect(body.error).toBe('Validation failed');

          expect(body.details).toEqual(
            expect.arrayContaining(
              requiredFieldMessages.map(expected =>
                expect.objectContaining(expected)
              )
            )
          );
        }
      );
    }
  );

  // =====================================================
  // TC_API_16 - Customer name of exactly 2 characters (BVA)
  // =====================================================

  test(
    'TC_API_16 - Accept booking with customer name of exactly 2 characters (BVA)',
    async ({ bookingApi, eventsApi }) => {

      const event = await test.step(
        'Retrieve available event',
        async () => eventsApi.getAvailableEvent(2)
      );

      const bookingData: CreateBookingRequest = {
        ...validBookingData,
        eventId: event.id,
        customerName: 'Al'
      };

      const response = await test.step(
        'Create booking with a 2-character name',
        async () => bookingApi.createBooking(bookingData)
      );

      await test.step(
        'Verify the booking is created',
        async () => {

          const body = await response.json();

          expect(
            response.status(),
            JSON.stringify(body)
          ).toBe(201);

          expect(body.success).toBe(true);

          expect(body.data.customerName).toBe(
            bookingData.customerName
          );
        }
      );

      // The booking is tracked and cancelled by the API fixture.
    }
  );

  // =====================================================
  // TC_API_17 - Customer phone of exactly 10 digits (BVA)
  // =====================================================

  test(
    'TC_API_17 - Accept booking with customer phone of exactly 10 digits (BVA)',
    async ({ bookingApi, eventsApi }) => {

      const event = await test.step(
        'Retrieve available event',
        async () => eventsApi.getAvailableEvent(2)
      );

      const bookingData: CreateBookingRequest = {
        ...validBookingData,
        eventId: event.id,
        customerName: `API Min Phone ${Date.now()}`,
        customerPhone: '1234567890'
      };

      const response = await test.step(
        'Create booking with a 10-digit phone',
        async () => bookingApi.createBooking(bookingData)
      );

      await test.step(
        'Verify the booking is created',
        async () => {

          const body = await response.json();

          expect(
            response.status(),
            JSON.stringify(body)
          ).toBe(201);

          expect(body.success).toBe(true);

          expect(body.data.customerPhone).toBe(
            bookingData.customerPhone
          );
        }
      );

      // The booking is tracked and cancelled by the API fixture.
    }
  );

  // =====================================================
  // TC_API_18 - Non-numeric booking ID on cancellation
  // =====================================================

  // TC_API_18 - Non-numeric booking ID
test(
  'TC_API_18 - Reject cancellation with a non-numeric booking ID',
  async ({ authenticatedRequest }) => {

    const response = await test.step(
      'Attempt cancellation with invalid booking ID "abc"',
      async () => authenticatedRequest.delete('bookings/abc')
    );

    await test.step(
      'Verify HTTP 404 - Booking not found',
      async () => {

        const responseBody = await response.text();

        expect(
          response.status(),
          `Expected 404, received ${response.status()}. Response: ${responseBody}`
        ).toBe(404);
      }
    );
  }
);

});
