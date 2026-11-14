
import { Page, expect } from '@playwright/test';

export class LoginPage {

  constructor(private readonly page: Page) {}

async navigateToLogin() {
  await this.page.goto('/login', {
    waitUntil: 'domcontentloaded',
    timeout: 45000
  })};

  async login(email: string, password: string) {

    await this.page.getByRole('textbox', {
      name: 'Email'
    }).fill(email);

    await this.page.getByRole('textbox', {
      name: 'Password'
    }).fill(password);

    await this.page.getByRole('button', {
      name: 'Sign In'
    }).click();

    // Verify we have left the login page
    await expect(this.page).not.toHaveURL(/\/login\/?$/);
  }
}
