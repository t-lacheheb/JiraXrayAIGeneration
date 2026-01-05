import { test } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { CreateIssuePage } from './pages/CreateIssuePage';
import { loadData } from './utils/data-loader';

const data = loadData();

test.describe('Create Xray Test Executions', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(data.credentials.username, data.credentials.password);
  });

  for (const execItem of data.testExecutions) {
    test(`Create Execution: ${execItem.summary}`, async ({ page }) => {
      const createPage = new CreateIssuePage(page);
      
      await createPage.openCreateModal();
      await createPage.selectProject(data.projectKey);
      await createPage.selectIssueType('Test Execution'); 
      
      await createPage.fillSummary(execItem.summary);
      await createPage.fillDescription(execItem.description);
      
      // Link to Test Plan (if field is available on create screen)
      // Usually a custom field "Test Plan" or via "Issue Links"
      
      await createPage.submit();
      
      // TODO: 
      // 1. Navigate to created Execution
      // 2. Click "Add Tests" -> Select tests from `execItem.tests`
      // 3. For each test row in the execution table, set status (PASS/FAIL)
      //    - This requires complex table interaction: finding the row by Test Key, then clicking the Status dropdown.
    });
  }
});
