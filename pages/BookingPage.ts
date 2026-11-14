
import { Page, expect } from '@playwright/test';

export class BookingPage {

  constructor(private readonly page: Page) {}

  // Select the required ticket quantity
  async selectTicketQuantity(quantity: number) {

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error('Quantity must be a positive integer');
    }

    // EventHub defaults to one ticket
    const increaseButton = this.page.getByRole('button', {
      name: '+',
      exact: true
    });

    for (let i = 1; i < quantity; i++) {
      await increaseButton.click();
    }

    const summary = await this.getTicketSummary();

    expect(summary.quantity).toBe(quantity);
  }

  // Read ticket price and quantity dynamically
  async getTicketSummary() {

    const summary = this.page.getByText(
      /^\$[\d,.]+\s*×\s*\d+\s*tickets?$/
    );

    await expect(summary).toBeVisible();

    const text = (await summary.innerText()).trim();

    const match = text.match(
      /^\$([\d,.]+)\s*×\s*(\d+)\s*tickets?$/
    );

    if (!match) {
      throw new Error(`Invalid ticket summary: ${text}`);
    }

    return {
      ticketPrice: Number(match[1].replace(/,/g, '')),
      quantity: Number(match[2])
    };
  }

  // Read an amount beside a label
  private async readAmount(label: string): Promise<number> {

    const row = this.page.getByText(label, {
      exact: true
    }).last().locator('..');

    await expect(row).toBeVisible();

    const text = await row.innerText();

    const match = text.match(
      /\$\s*([\d,]+(?:\.\d{1,2})?)/
    );

    if (!match) {
      throw new Error(
        `Unable to extract amount near ${label}: ${text}`
      );
    }

    return Number(match[1].replace(/,/g, ''));
  }

  // Read displayed total price
  async getDisplayedTotal(): Promise<number> {
    return this.readAmount('Total');
  }

  // Enter customer information
  async enterCustomerDetails(
    name: string,
    email: string,
    phone: string
  ) {

    await this.page.getByRole('textbox', {
      name: 'Full Name*'
    }).fill(name);

    await this.page.getByTestId(
      'customer-email'
    ).fill(email);

    await this.page.getByRole('textbox', {
      name: 'Phone Number*'
    }).fill(phone);
  }

  // Submit without expecting a specific result
  async submitBooking() {
    await this.page.getByRole('button', {
      name: 'Confirm Booking'
    }).click();
  }

  // Submit and verify successful confirmation
  async confirmBooking() {

    await this.submitBooking();

    await expect(
      this.page.getByText('Booking Confirmed!', {
        exact: false
      })
    ).toBeVisible();
  }

  // Extract generated booking reference
  async getBookingReference(): Promise<string> {

    const reference = this.page.getByText(
      /^[A-Z]-[A-Z0-9]+$/
    ).first();

    await expect(reference).toBeVisible();

    return (await reference.innerText()).trim();
  }

  // Open My Bookings after confirmation
  async openMyBookings() {

    await this.page.getByRole('button', {
      name: 'View My Bookings'
    }).click();
  }

  // Email validation
  async verifyEmailValidationError() {

    await expect(
      this.page.getByText('Enter a valid email', {
        exact: true
      })
    ).toBeVisible();
  }

  // Phone validation
  async verifyPhoneValidationError() {

    await expect(
      this.page.getByText('Enter a valid 10-digit phone', {
        exact: true
      })
    ).toBeVisible();
  }
}
