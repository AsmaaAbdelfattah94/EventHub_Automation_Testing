
import {
  APIRequestContext,
  APIResponse
} from '@playwright/test';

import {
  CreateBookingRequest,
  BookingData
} from './models/BookingModels';

type BookingTracking = {
  onCreated?: (id: number) => void;
  onCancelled?: (id: number) => void;
};

export class BookingApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly tracking: BookingTracking = {}
  ) {}

  async createBooking(
    bookingData: CreateBookingRequest
  ): Promise<APIResponse> {

    const response = await this.request.post('bookings', {
      data: bookingData
    });

    // Track successful creations before the test
    // starts asserting the response.
    if (response.status() === 201) {
      const body = await response.json();
      const id = body?.data?.id;

      if (!Number.isInteger(id) || id <= 0) {
        throw new Error(
          'Booking created but no valid booking ID returned'
        );
      }

      this.tracking.onCreated?.(id);
    }

    return response;
  }

  async getBookings(
    page = 1,
    limit = 50
  ): Promise<APIResponse> {

    return this.request.get('bookings', {
      params: { page, limit },
      maxRetries: 5
    });
  }

  async findBookingById(
    bookingId: number
  ): Promise<BookingData | undefined> {

    let page = 1;

    while (true) {
      const response = await this.getBookings(page, 50);

      if (response.status() !== 200) {
        throw new Error(
          `GET bookings failed: HTTP ${response.status()}`
        );
      }

      const body = await response.json();

      if (!body.success || !Array.isArray(body.data)) {
        throw new Error('Invalid bookings response');
      }

      const found = (body.data as BookingData[])
        .find(booking => booking.id === bookingId);

      if (found) return found;

      const totalPages = body.pagination?.totalPages;

      if (
        !Number.isInteger(totalPages) ||
        totalPages < 1
      ) {
        throw new Error('Invalid bookings pagination');
      }

      if (page >= totalPages) return undefined;

      page++;
    }
  }

  async cancelBooking(
    bookingId: number
  ): Promise<APIResponse> {

    const response = await this.request.delete(
      `bookings/${bookingId}`
    );

    if (response.status() === 200) {
      this.tracking.onCancelled?.(bookingId);
    }

    return response;
  }
}
