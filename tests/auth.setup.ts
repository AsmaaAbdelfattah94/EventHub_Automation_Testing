
import { test as setup, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import fs from 'fs';
import path from 'path';

// Authentication file location
const authFile = path.join(
  process.cwd(),
  'playwright',
  '.auth',
  'user.json'
);

setup('Authenticate EventHub user', async ({ page }) => {

  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  if (!email || !password) {
    throw new Error('Missing credentials in .env');
  }

  // Step 1: Login
  const loginPage = new LoginPage(page);

  await loginPage.navigateToLogin();
  await loginPage.login(email, password);

  // Step 2: Verify successful login
  await expect(page).not.toHaveURL(/\/login\/?$/);

  // Step 3: Create directory automatically
  fs.mkdirSync(path.dirname(authFile), {
    recursive: true
  });

  // Step 4: Save authentication state
  await page.context().storageState({
    path: authFile
  });

});
