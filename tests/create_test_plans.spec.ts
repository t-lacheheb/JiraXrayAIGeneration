import { test } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { CreateIssuePage } from './pages/CreateIssuePage';
import { loadData } from './utils/data-loader';

const data = loadData(process.env.dataPath || '');

test.describe('Create Xray Test Plans', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(process.env.JIRA_USERNAME || '', process.env.JIRA_PASSWORD || '');
  });

    for (const planItem of (data as any).testPlans || []) {
    test(`Create Test Plan: ${planItem.summary}`, async ({ page }) => {
      const createPage = new CreateIssuePage(page);
      
      await createPage.openCreateModal();
      await createPage.selectProject(process.env.projectKey || '');
      await createPage.selectIssueType('Test Plan'); 
      
      await createPage.fillSummary(planItem.summary);
      await createPage.fillDescription(planItem.description);
      
      // Fix Version is often a standard Jira field
      // await createPage.selectFixVersion(planItem.fixVersion);

      await createPage.submit();
      
      // TODO: Add Test Sets or Tests to the plan
    });
  }
});
