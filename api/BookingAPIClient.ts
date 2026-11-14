
import {
  APIRequestContext,
  APIResponse
} from '@playwright/test';

import {
  CreateBookingRequest,
  BookingData,
  BookingResponse
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

  async getBookingById(
    bookingId: number
  ): Promise<APIResponse> {

    return this.request.get(`bookings/${bookingId}`);
  }

  // Booking from GET /bookings/{id}, or undefined if it does not exist
  async findBooking(
    bookingId: number
  ): Promise<BookingData | undefined> {

    const response = await this.getBookingById(bookingId);

    if (response.status() === 404) return undefined;

    if (response.status() !== 200) {
      throw new Error(
        `GET bookings/${bookingId} failed: HTTP ${response.status()}`
      );
    }

    const body =
      (await response.json()) as BookingResponse;

    if (!body.success || !body.data) {
      throw new Error(`Invalid response for booking ${bookingId}`);
    }

    return body.data;
  }

  async getBookingByRef(
    bookingRef: string
  ): Promise<APIResponse> {

    return this.request.get(
      `bookings/ref/${encodeURIComponent(bookingRef)}`
    );
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
