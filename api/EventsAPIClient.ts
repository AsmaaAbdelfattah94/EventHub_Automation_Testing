
import {
  APIRequestContext,
  APIResponse
} from '@playwright/test';

import {
  EventData,
  EventsResponse
} from './models/EventModels';

export class EventsApiClient {
  constructor(
    private readonly request: APIRequestContext
  ) {}

  async getEvents(
    page = 1,
    limit = 50
  ): Promise<APIResponse> {
    return this.request.get('events', {
      params: { page, limit },
        maxRetries: 5
    });
  }

  async getAvailableEvent(
  requiredSeats = 2,
  excludedEventIds: number[] = []
): Promise<EventData> {

    let page = 1;

    while (true) {
      const response = await this.getEvents(page, 50);

      if (response.status() !== 200) {
        throw new Error(
          `GET events failed: HTTP ${response.status()}`
        );
      }

      const body =
        (await response.json()) as EventsResponse;

      if (!body.success || !Array.isArray(body.data)) {
        throw new Error('Invalid events response');
      }

      const found = body.data.find(event =>
        event.id > 0 &&
        Number(event.price) > 0 &&
        event.availableSeats >= requiredSeats &&
        !excludedEventIds.includes(event.id)
        );

      if (found) return found;

      const totalPages = body.pagination?.totalPages;

      if (
        !Number.isInteger(totalPages) ||
        totalPages < 1
      ) {
        throw new Error('Invalid events pagination');
      }

      if (page >= totalPages) {
        throw new Error(
          `No event has ${requiredSeats} available seats`
        );
      }

      page++;
    }
  }

  async getEventById(eventId: number): Promise<EventData> {

    let page = 1;

    while (true) {
      const response = await this.getEvents(page, 50);

      if (response.status() !== 200) {
        throw new Error(
          `GET events failed: HTTP ${response.status()}`
        );
      }

      const body =
        (await response.json()) as EventsResponse;

      if (!body.success || !Array.isArray(body.data)) {
        throw new Error('Invalid events response');
      }

      const found = body.data.find(
        event => event.id === eventId
      );

      if (found) return found;

      const totalPages = body.pagination?.totalPages;

      if (
        !Number.isInteger(totalPages) ||
        totalPages < 1
      ) {
        throw new Error('Invalid events pagination');
      }

      if (page >= totalPages) {
        throw new Error(`Event ${eventId} not found`);
      }

      page++;
    }
  }

async getEventWithLimitedSeats(
  maxAvailableSeats: number = 9
): Promise<EventData> {

  let page = 1;

  while (true) {

    const response = await this.getEvents(page, 50);

    if (response.status() !== 200) {
      throw new Error(
        `GET /events failed: HTTP ${response.status()}`
      );
    }

    const body =
      (await response.json()) as EventsResponse;

    if (!body.success || !Array.isArray(body.data)) {
      throw new Error('Invalid events response');
    }

    // Find an event with fewer than 10 available seats
    const found = body.data.find(event =>
      event.id > 0 &&
      event.availableSeats > 0 &&
      event.availableSeats <= maxAvailableSeats
    );

    if (found) {
      return found;
    }

    const totalPages = body.pagination?.totalPages;

    if (
      !Number.isInteger(totalPages) ||
      totalPages < 1
    ) {
      throw new Error('Invalid events pagination');
    }

    if (page >= totalPages) {
      throw new Error(
        `No event found with 1-${maxAvailableSeats} available seats`
      );
    }

    page++;
  }
}

}
