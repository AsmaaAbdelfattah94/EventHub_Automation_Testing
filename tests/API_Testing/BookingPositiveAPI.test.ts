
import { test, expect } from '../../fixtures/apiFixtures';

import { BOOKING_REF_PATTERN } from '../../utils/bookingReference';

import {
  CreateBookingRequest,
  CreateBookingResponse
} from '../../api/models/BookingModels';

test(
  'TC_API_01 - Successfully create and validate booking',
  {
    annotation: {
      type: 'open-question',
      description:
        'A dotted Gmail address is stored lower-cased with the dots removed. Must the email be stored exactly as submitted? See README: Story / documentation / application mismatches.'
    }
  },
  async ({ bookingApi, eventsApi }) => {

    // STEP 1 - Retrieve an available event
    const event = await test.step(
      'Retrieve available event',
      async () => {
        return eventsApi.getAvailableEvent(2);
      }
    );

    // STEP 2 - Get customer email from environment
    const customerEmail = process.env.TEST_EMAIL;

    if (!customerEmail) {
      throw new Error('TEST_EMAIL is missing from .env');
    }

    // STEP 3 - Prepare booking data
    const bookingData: CreateBookingRequest = {
      eventId: event.id,
      customerName: `API Automation ${Date.now()}`,
      customerEmail,
      customerPhone: '+919876543210',
      quantity: 2
    };

    // STEP 4 - Create booking
    const response = await test.step(
      'Create booking using POST API',
      async () => {
        return bookingApi.createBooking(bookingData);
      }
    );

    // STEP 5 - Verify response status and data
    await test.step(
      'Verify successful booking response',
      async () => {

        const body =
          (await response.json()) as CreateBookingResponse;

        expect(
          response.status(),
          `Unexpected response: ${JSON.stringify(body)}`
        ).toBe(201);

        expect(body.success).toBe(true);
        expect(body.message).toBe('Booking confirmed!');

        // Verify booking ID and reference
        expect(body.data.id).toBeGreaterThan(0);
        expect(body.data.bookingRef).toMatch(BOOKING_REF_PATTERN);

        // Verify booking status
        expect(body.data.status).toBe('confirmed');

        // Verify event information
        expect(body.data.eventId).toBe(
          bookingData.eventId
        );

        expect(body.data.event.id).toBe(
          bookingData.eventId
        );

        // Verify customer details
        expect(body.data.customerName).toBe(
          bookingData.customerName
        );

        expect(body.data.customerPhone).toBe(
          bookingData.customerPhone
        );

        // Verify ticket quantity
        expect(body.data.quantity).toBe(
          bookingData.quantity
        );

        // Verify total price using the price from GET /events
        const expectedTotal =
          Number(event.price) * bookingData.quantity;

        expect(Number(body.data.totalPrice)).toBeCloseTo(
          expectedTotal,
          2
        );

        // Open question: kept last so every check above still runs.
        // Only this strict email comparison is an expected failure.
        test.fail(
          true,
          'Open question for the PO: dotted Gmail addresses are stored without dots'
        );

        // Strict comparison: Preserve submitted email
        expect(body.data.customerEmail).toBe(
          bookingData.customerEmail
        );
      }
    );

    // Booking is automatically tracked and cancelled
    // by apiFixtures.ts after the test finishes.
  }
);
