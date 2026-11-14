
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

      const response = await test.step(
        'Attempt booking for nonexistent event',
        async () => bookingApi.createBooking({
          ...validBookingData,
          eventId: 2147483647
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
          expect(body.error).toBeTruthy();
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

      console.log(
        `Selected event ID: ${event.id}, ` +
        `Available seats: ${event.availableSeats}`
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

});
