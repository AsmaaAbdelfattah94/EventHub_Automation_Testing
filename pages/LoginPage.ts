
import { Page } from '@playwright/test';

export class LoginPage {

  constructor(private readonly page: Page) {}

  async navigateToLogin() {
    await this.page.goto('/login', {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });
  }

  async login(email: string, password: string) {

    const passwordInput = this.page.getByRole('textbox', {
      name: 'Password'
    });

    try {
      await this.page.getByRole('textbox', {
        name: 'Email'
      }).fill(email);

      await passwordInput.fill(password);

      await this.page.getByRole('button', {
        name: 'Sign In'
      }).click();

      // Verify we have left the login page. waitForURL is used instead of
      // expect(): a failed expect() snapshots the page with the password.
      await this.page.waitForURL(
        url => !/\/login\/?$/.test(url.pathname),
        { timeout: 15000 }
      );
    } catch (error) {
      // On failure Playwright saves a page snapshot (error-context.md) that
      // includes input values. Clear the password so it is never recorded.
      await passwordInput.fill('', { timeout: 2000 }).catch(() => {});
      throw error;
    }
  }
}
