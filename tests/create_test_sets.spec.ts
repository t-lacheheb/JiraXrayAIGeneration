import { test } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { CreateIssuePage } from './pages/CreateIssuePage';
import { loadData } from './utils/data-loader';

const data = loadData();

test.describe('Create Xray Test Sets', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(data.credentials.username, data.credentials.password);
  });

  for (const setItem of data.testSets) {
    test(`Create Test Set: ${setItem.summary}`, async ({ page }) => {
      const createPage = new CreateIssuePage(page);
      
      await createPage.openCreateModal();
      await createPage.selectProject(data.projectKey);
      await createPage.selectIssueType('Test Set'); 
      
      await createPage.fillSummary(setItem.summary);
      await createPage.fillDescription(setItem.description);

      await createPage.submit();
      
      // TODO: Add tests to the set
      // This usually involves navigating to the created Test Set
      // Clicking "Add Tests"
      // Searching and selecting tests
    });
  }
});
