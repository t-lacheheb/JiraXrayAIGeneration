import { Page } from '@playwright/test';

export class TestDetailsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigateTo(issueKey: string) {
    await this.page.goto(`/browse/${issueKey}`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async addStep(action: string, data: string, result: string) {
    // This assumes you are on the View Issue page for a Test
    
    // 1. Locate the Test Details section (Xray)
    // The "Manual Steps" section often has an "Add" button
    
    // Example logic (needs specific selectors):
    // await this.page.click('#test-step-add-button');
    // await this.page.fill('#step-action', action);
    // await this.page.fill('#step-data', data);
    // await this.page.fill('#step-result', result);
    // await this.page.click('#step-save-button');
    
    console.log(`[Simulated] Added step to current issue: ${action}`);
  }
}
