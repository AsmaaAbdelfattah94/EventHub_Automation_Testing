
import {
  APIRequestContext,
  APIResponse
} from '@playwright/test';

import {
  EventData,
  EventResponse,
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

  // Fetch one event through GET /events/{id}
  async getEvent(eventId: number): Promise<EventData> {

    const response = await this.request.get(
      `events/${eventId}`,
      { maxRetries: 5 }
    );

    if (response.status() !== 200) {
      throw new Error(
        `GET events/${eventId} failed: HTTP ${response.status()}`
      );
    }

    const body =
      (await response.json()) as EventResponse;

    if (!body.success || !body.data) {
      throw new Error(`Invalid response for event ${eventId}`);
    }

    return body.data;
  }

  // First event with enough seats, optionally skipping some IDs
  async getAvailableEvent(
    requiredSeats = 2,
    excludedEventIds: number[] = []
  ): Promise<EventData> {

    return this.findFirstEvent(
      event =>
        event.id > 0 &&
        Number(event.price) > 0 &&
        event.availableSeats >= requiredSeats &&
        !excludedEventIds.includes(event.id),
      `No event has ${requiredSeats} available seats`
    );
  }

  // First event with between 1 and maxAvailableSeats seats left
  async getEventWithLimitedSeats(
    maxAvailableSeats = 9
  ): Promise<EventData> {

    return this.findFirstEvent(
      event =>
        event.id > 0 &&
        event.availableSeats > 0 &&
        event.availableSeats <= maxAvailableSeats,
      `No event found with 1-${maxAvailableSeats} available seats`
    );
  }

  // Page through GET /events and return the first matching event
  private async findFirstEvent(
    matches: (event: EventData) => boolean,
    notFoundMessage: string
  ): Promise<EventData> {

    for (let page = 1; ; page++) {

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

      const found = body.data.find(matches);

      if (found) return found;

      const totalPages = body.pagination?.totalPages;

      if (
        !Number.isInteger(totalPages) ||
        totalPages < 1
      ) {
        throw new Error('Invalid events pagination');
      }

      if (page >= totalPages) {
        throw new Error(notFoundMessage);
      }
    }
  }
}
