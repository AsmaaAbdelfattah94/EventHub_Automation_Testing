
import { test as base, expect } from '@playwright/test';

import { EventsPage } from '../pages/EventsPage';
import { BookingPage } from '../pages/BookingPage';
import { MyBookingsPage } from '../pages/MyBookingPage';
import { cancelTestBookings } from '../utils/targetedBookingCleanup';

type UiFixtures = {
  eventsPage: EventsPage;
  bookingPage: BookingPage;
  myBookingsPage: MyBookingsPage;
  trackBooking: (reference: string) => void;
};

export const test = base.extend<UiFixtures>({

  eventsPage: async ({ page }, use) => {
    await use(new EventsPage(page));
  },

  bookingPage: async ({ page }, use) => {
    await use(new BookingPage(page));
  },

  myBookingsPage: async ({ page }, use) => {
    await use(new MyBookingsPage(page));
  },

  // Records the references of bookings the test creates. After the test,
  // including when it fails, only those bookings are cancelled. References
  // the test already cancelled itself are skipped by the cleanup.
  trackBooking: async ({ page }, use) => {

    const references = new Set<string>();

    await use(reference => {
      references.add(reference);
    });

    if (references.size > 0) {
      await base.step('Cancel bookings created by this test', async () => {
        await cancelTestBookings(page, references);
      });
    }
  }
});

export { expect };
