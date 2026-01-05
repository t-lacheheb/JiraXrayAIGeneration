import { Page } from '@playwright/test';

export class LoginPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate() {
    await this.page.goto('/');
  }

  async login(username: string, pass: string) {
    // Standard Jira selectors - User might need to update these
    await this.page.fill('input[name="os_username"]', username);
    await this.page.fill('input[name="os_password"]', pass);
    
    // Click login button - often has id login-form-submit or similar
    // Using a more generic selector just in case
    await this.page.click('#login-form-submit, input[value="Log In"], button:has-text("Log In")');
    
    // Wait for navigation or a specific element that shows we are logged in
    await this.page.waitForLoadState('networkidle');
  }
}
