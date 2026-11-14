
import { test, expect } from '../../fixtures/apiFixtures';

import { BOOKING_REF_PATTERN } from '../../utils/bookingReference';

import {
  CreateBookingRequest,
  CreateBookingResponse
} from '../../api/models/BookingModels';

test.describe('Multiple Booking API Scenarios', () => {

  const customerPhone = '+919876543210';

  // =====================================================
  // TC_API_06 - Book two different events
  // =====================================================

  test(
    'TC_API_06 - Book two different events successfully',
    async ({ bookingApi, eventsApi }) => {

      test.setTimeout(90000);

      const customerEmail = process.env.TEST_EMAIL;

      if (!customerEmail) {
        throw new Error('TEST_EMAIL is missing');
      }

      const quantities = [1, 2];

      // STEP 1 - Retrieve two different events
      const events = await test.step(
        'Retrieve two distinct available events',
        async () => {

          const firstEvent =
            await eventsApi.getAvailableEvent(2);

          const secondEvent =
            await eventsApi.getAvailableEvent(
              2,
              [firstEvent.id]
            );

          expect(firstEvent.id).not.toBe(secondEvent.id);

          return [firstEvent, secondEvent];
        }
      );

      const createdBookings: CreateBookingResponse['data'][] = [];

      // STEP 2 - Create bookings for both events
      for (let i = 0; i < events.length; i++) {

        const event = events[i];
        const quantity = quantities[i];

        await test.step(
          `Create booking for ${event.title}`,
          async () => {

            const bookingData: CreateBookingRequest = {
              eventId: event.id,
              customerName: `API Multiple Events ${Date.now()} ${i}`,
              customerEmail,
              customerPhone,
              quantity
            };

            const response =
              await bookingApi.createBooking(bookingData);

            expect(response.status()).toBe(201);

            const body =
              (await response.json()) as CreateBookingResponse;

            expect(body.success).toBe(true);
            expect(body.data.id).toBeGreaterThan(0);
            expect(body.data.bookingRef).toMatch(BOOKING_REF_PATTERN);

            expect(body.data.eventId).toBe(event.id);
            expect(body.data.quantity).toBe(quantity);
            expect(body.data.status).toBe('confirmed');

            // API may return prices as strings
            expect(Number(body.data.totalPrice)).toBeCloseTo(
              Number(event.price) * quantity,
              2
            );

            createdBookings.push(body.data);
          }
        );
      }

      // STEP 3 - Verify unique booking references
      await test.step(
        'Verify booking references are unique',
        async () => {

          expect(createdBookings).toHaveLength(2);

          expect(createdBookings[0].id).not.toBe(
            createdBookings[1].id
          );

          expect(createdBookings[0].bookingRef).not.toBe(
            createdBookings[1].bookingRef
          );
        }
      );

      // STEP 4 - Verify both bookings using GET /bookings
      await test.step(
        'Verify both bookings are persisted correctly',
        async () => {

          for (let i = 0; i < createdBookings.length; i++) {

            const created = createdBookings[i];
            const event = events[i];
            const quantity = quantities[i];

            const saved =
              await bookingApi.findBooking(created.id);

            expect(saved).toBeDefined();

            expect(saved?.bookingRef).toBe(
              created.bookingRef
            );

            expect(saved?.eventId).toBe(event.id);
            expect(saved?.quantity).toBe(quantity);
            expect(saved?.status).toBe('confirmed');

            expect(Number(saved?.totalPrice)).toBeCloseTo(
              Number(event.price) * quantity,
              2
            );
          }
        }
      );

      // Both bookings are automatically cancelled
      // during fixture teardown.
    }
  );

  // =====================================================
  // TC_API_07 - Maximum ticket limit across bookings
  // =====================================================

  test(
    'TC_API_07 - Reject second booking after booking 10 tickets',
    {
      annotation: {
        type: 'open-question',
        description:
          'The API docs limit quantity to 1-10 per request only. Is the 10-ticket maximum cumulative per user/event? See README: Story / documentation / application mismatches.'
      }
    },
    async ({ bookingApi, eventsApi }) => {

      test.setTimeout(90000);

      const customerEmail = process.env.TEST_EMAIL;

      if (!customerEmail) {
        throw new Error('TEST_EMAIL is missing');
      }

      const quantity = 10;
      const customerName =
        `API Ticket Limit ${Date.now()}`;

      // STEP 1 - Retrieve event with sufficient seats
      const event = await test.step(
        'Retrieve event with at least 20 available seats',
        async () => {

          return eventsApi.getAvailableEvent(20);
        }
      );

      const bookingData: CreateBookingRequest = {
        eventId: event.id,
        customerName,
        customerEmail,
        customerPhone,
        quantity
      };

      // STEP 2 - Create first booking
      const firstBooking = await test.step(
        'Create first booking for 10 tickets',
        async () => {

          const response =
            await bookingApi.createBooking(bookingData);

          expect(response.status()).toBe(201);

          const body =
            (await response.json()) as CreateBookingResponse;

          expect(body.success).toBe(true);
          expect(body.data.id).toBeGreaterThan(0);
          expect(body.data.bookingRef).toMatch(BOOKING_REF_PATTERN);

          expect(body.data.eventId).toBe(event.id);
          expect(body.data.quantity).toBe(10);
          expect(body.data.status).toBe('confirmed');

          return body.data;
        }
      );

      // STEP 3 - Verify first booking exists
      await test.step(
        'Verify first booking using GET /bookings',
        async () => {

          const saved =
            await bookingApi.findBooking(
              firstBooking.id
            );

          expect(saved).toBeDefined();

          expect(saved?.bookingRef).toBe(
            firstBooking.bookingRef
          );

          expect(saved?.eventId).toBe(event.id);
          expect(saved?.quantity).toBe(10);
          expect(saved?.status).toBe('confirmed');
        }
      );

      // STEP 4 - Attempt another booking for the same event
      const secondResponse = await test.step(
        'Attempt second booking for 10 tickets',
        async () => {

          return bookingApi.createBooking(bookingData);
        }
      );

      // STEP 5 - Verify maximum ticket limit
      // Marked as an expected failure only from here, so any failure in
      // steps 1-4 is still reported as a real regression.
      test.fail(
        true,
        'Open question for the PO: the second 10-ticket booking is accepted (201)'
      );

      await test.step(
        'Verify second booking is rejected',
        async () => {

          const status = secondResponse.status();
          const responseText = await secondResponse.text();

          // A rejection is expected, but the exact
          // status code needs to be confirmed.
          expect(
            status,
            `Unexpected response: ${responseText}`
          ).toBeGreaterThanOrEqual(400);

          expect(status).toBeLessThan(500);

          expect(responseText).toMatch(
            /maximum|max.*tickets|limit|already booked/i
          );
        }
      );

      // STEP 6 - Verify original booking remains confirmed
      await test.step(
        'Verify first booking remains confirmed',
        async () => {

          const saved =
            await bookingApi.findBooking(
              firstBooking.id
            );

          expect(saved).toBeDefined();

          expect(saved?.bookingRef).toBe(
            firstBooking.bookingRef
          );

          expect(saved?.eventId).toBe(event.id);
          expect(saved?.quantity).toBe(10);
          expect(saved?.status).toBe('confirmed');
        }
      );

      // Automatic cleanup:
      // - First booking is cancelled.
      // - If the second booking unexpectedly succeeds,
      //   it is also tracked and cancelled.
    }
  );





});