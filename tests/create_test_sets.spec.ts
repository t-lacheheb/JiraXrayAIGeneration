import { test } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { CreateIssuePage } from './pages/CreateIssuePage';
import { loadData } from './utils/data-loader';
import fs from 'fs';

const data = loadData(process.env.dataPath || '../data.json');

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

      //catch the created test set id
      const testSetId = await createPage.getCreatedIssueId();
      
      // return the test set id
      setItem.id = testSetId;
      // save the data file
      fs.writeFileSync(process.env.dataPath || '', JSON.stringify(data, null, 2));
      
    });
  }
});
