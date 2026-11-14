
import { test, expect } from '../../fixtures/apiFixtures';

import { BOOKING_REF_PATTERN } from '../../utils/bookingReference';

import {
  CreateBookingRequest,
  CreateBookingResponse
} from '../../api/models/BookingModels';

test(
  'TC_API_05 - Verify booking lifecycle and seat restoration',
  async ({ bookingApi, eventsApi }) => {

    test.setTimeout(90000);

    const email = process.env.TEST_EMAIL;

    if (!email) {
      throw new Error('TEST_EMAIL is missing');
    }

    const quantity = 2;

    // STEP 1 - Get a valid event
    const event = await test.step(
      'Retrieve available event',
      async () => {

        const availableEvent =
          await eventsApi.getAvailableEvent(quantity);


        return availableEvent;
      }
    );

    const seatsBefore = event.availableSeats;

    const bookingData: CreateBookingRequest = {
      eventId: event.id,
      customerName: `API Lifecycle ${Date.now()}`,
      customerEmail: email,
      customerPhone: '+919876543210',
      quantity
    };

    // STEP 2 - Create booking
    const booking = await test.step(
      'Create booking',
      async () => {

        const response =
          await bookingApi.createBooking(bookingData);

        expect(response.status()).toBe(201);

        const body =
          (await response.json()) as CreateBookingResponse;

        expect(body.success).toBe(true);
        expect(body.data.id).toBeGreaterThan(0);
        expect(body.data.bookingRef).toMatch(BOOKING_REF_PATTERN);

        return body.data;
      }
    );

    // STEP 3 - Verify seats decreased
    await test.step(
      'Verify inventory decreased',
      async () => {

        await expect.poll(
          async () => {
            const updatedEvent =
              await eventsApi.getEvent(event.id);

            return updatedEvent.availableSeats;
          },
          {
            message: 'Seats should decrease after booking',
            timeout: 15000
          }
        ).toBe(seatsBefore - quantity);
      }
    );

    // STEP 4 - Verify booking persisted
    await test.step(
      'Verify booking through GET bookings',
      async () => {

        const savedBooking =
          await bookingApi.findBooking(booking.id);

        expect(savedBooking).toBeDefined();

        expect(savedBooking?.bookingRef).toBe(
          booking.bookingRef
        );

        expect(savedBooking?.eventId).toBe(event.id);

        expect(savedBooking?.quantity).toBe(quantity);

        expect(savedBooking?.status).toBe('confirmed');

        expect(Number(savedBooking?.totalPrice)).toBeCloseTo(
          Number(event.price) * Number(quantity),
          2
        );
      }
    );

    // STEP 5 - Cancel booking
    await test.step(
      'Cancel booking',
      async () => {

        const response =
          await bookingApi.cancelBooking(booking.id);

        expect(response.status()).toBe(200);

        const body = await response.json();

        expect(body.success).toBe(true);
        expect(body.message).toBe('Booking cancelled');
      }
    );

    // STEP 6 - Verify the booking no longer exists (AC4)
    // Observed behaviour: cancellation permanently deletes the booking
    // (see README: Story / documentation / application mismatches).
    await test.step(
      'Verify cancelled booking no longer exists',
      async () => {

        const byId =
          await bookingApi.getBookingById(booking.id);

        expect(
          byId.status(),
          `GET bookings/${booking.id}: ${await byId.text()}`
        ).toBe(404);

        const byRef =
          await bookingApi.getBookingByRef(booking.bookingRef);

        expect(
          byRef.status(),
          `GET bookings/ref/${booking.bookingRef}: ${await byRef.text()}`
        ).toBe(404);
      }
    );

    // STEP 7 - Verify seats restored
    await test.step(
      'Verify inventory restored',
      async () => {

        await expect.poll(
          async () => {
            const restoredEvent =
              await eventsApi.getEvent(event.id);

            return restoredEvent.availableSeats;
          },
          {
            message: 'Seats should be restored after cancellation',
            timeout: 15000
          }
        ).toBe(seatsBefore);
      }
    );
  }
);
