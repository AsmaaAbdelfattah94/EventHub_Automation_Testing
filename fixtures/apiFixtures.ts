
import {
  test as base,
  expect,
  request,
  APIRequestContext
} from '@playwright/test';

import { AuthApiClient } from '../api/AuthAPIClient';
import { BookingApiClient } from '../api/BookingAPIClient';
import { EventsApiClient } from '../api/EventsAPIClient';

type ApiFixtures = {
  authenticatedRequest: APIRequestContext;
  bookingApi: BookingApiClient;
  eventsApi: EventsApiClient;
};

export const test = base.extend<ApiFixtures>({

  // Centralized authentication
  authenticatedRequest: async ({}, use) => {

    const baseURL = process.env.API_BASE_URL;
    const email = process.env.TEST_EMAIL;
    const password = process.env.TEST_PASSWORD;

    if (!baseURL || !email || !password) {
      throw new Error('Missing API environment variables');
    }

    const ignoreHTTPSErrors =
      process.env.API_IGNORE_HTTPS_ERRORS === 'true';

    const loginContext = await request.newContext({
      baseURL,
      ignoreHTTPSErrors,
      timeout: 90000
    });

    let authorizedContext: APIRequestContext | undefined;

    try {
      const authClient = new AuthApiClient(loginContext);

      const token = await authClient.getAccessToken(
        email,
        password
      );

      authorizedContext = await request.newContext({
        baseURL,
        ignoreHTTPSErrors,
        timeout: 90000,
        extraHTTPHeaders: {
          Authorization: `Bearer ${token}`
        }
      });

      await use(authorizedContext);

    } finally {
      await authorizedContext?.dispose();
      await loginContext.dispose();
    }
  },

  // Booking client with automatic tracking and cleanup
  bookingApi: async ({ authenticatedRequest }, use) => {

    const createdBookingIds = new Set<number>();

    const bookingApi = new BookingApiClient(
      authenticatedRequest,
      {
        onCreated: id => createdBookingIds.add(id),
        onCancelled: id => createdBookingIds.delete(id)
      }
    );

    try {
      await use(bookingApi);
    } finally {
      const cleanupErrors: string[] = [];

      // Only bookings created during this test
      for (const bookingId of [...createdBookingIds]) {
        try {
          const response =
            await bookingApi.cancelBooking(bookingId);

          if (response.status() !== 200) {
            cleanupErrors.push(
              `Booking ${bookingId}: HTTP ${response.status()}`
            );
            continue;
          }

          const body = await response.json();

          if (
            body.success !== true ||
            body.message !== 'Booking cancelled'
          ) {
            cleanupErrors.push(
              `Booking ${bookingId}: unexpected response`
            );
          }

        } catch (error) {
          cleanupErrors.push(
            `Booking ${bookingId}: ${String(error)}`
          );
        }
      }

      if (cleanupErrors.length > 0) {
        throw new Error(
          'Automatic booking cleanup failed:\n' +
          cleanupErrors.join('\n')
        );
      }
    }
  },

  eventsApi: async ({ authenticatedRequest }, use) => {
    await use(new EventsApiClient(authenticatedRequest));
  }
});

export { expect };
