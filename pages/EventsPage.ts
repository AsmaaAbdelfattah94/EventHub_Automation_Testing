
import { Page, expect } from '@playwright/test';

export class EventsPage {

  constructor(private readonly page: Page) {}

  // Navigate to EventHub events
  async openEvents() {
    await this.page.goto('/');
  }

  // Locate a specific event card
  getEventCard(eventName: string) {
    return this.page.getByRole('article').filter({
      hasText: eventName
    });
  }

  // Select an event for booking
  async selectEvent(eventName: string) {
    const eventCard = this.getEventCard(eventName);

    await expect(eventCard).toBeVisible();

    await eventCard.getByTestId('book-now-btn').click();
  }

  // Read the number of available seats
  async getAvailableSeats(eventName: string): Promise<number> {

    const eventCard = this.getEventCard(eventName);

    await expect(eventCard).toBeVisible();

    const availability = eventCard.getByText(
      /[\d,]+\s+seats available/i
    );

    await expect(availability).toBeVisible();

    const text = await availability.innerText();

    const match = text.match(
      /([\d,]+)\s+seats available/i
    );

    if (!match) {
      throw new Error(
        `Unable to extract available seats: ${text}`
      );
    }

    return Number(match[1].replace(/,/g, ''));
  }
}
