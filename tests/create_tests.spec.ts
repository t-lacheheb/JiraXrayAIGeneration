import { test, Page } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { CreateIssuePage } from './pages/CreateIssuePage';
import { TestDetailsPage } from './pages/TestDetailsPage';
import { loadData } from './utils/data-loader';

const data = loadData();

test.describe.serial('Create Xray Tests', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(data.credentials.username, data.credentials.password);
  });

  test.afterAll(async () => {
    await page.close();
  });

  const testsCount = data.tests.length;
  let counter = 0;

  for (const testItem of data.tests) {
    // We increment counter inside the loop definition phase
    // Note: We need to capture the current value for the test closure
    const currentTestIndex = ++counter; 

    test(`Create Test: ${testItem.summary}`, async () => {
      const createPage = new CreateIssuePage(page);
      
      // Only open the modal for the first test
      if (currentTestIndex === 1) {
        await createPage.openCreateModal();
      }

      // ... rest of logic ...
      await createPage.selectProject(data.projectKey);
      await createPage.selectIssueType('Test'); 
      
      await createPage.fillSummary(testItem.summary);
      
      await createPage.fillDescription(testItem.description);
     

      // Handle Components
      if (testItem.components && testItem.components.length > 0) {
        await createPage.fillComponents(testItem.components);
      }
      
      // Handle Priority
      if (testItem.priority) {             
        await createPage.fillPriority(testItem.priority);
      }
      
      // Handle Test Details Fields
      if (testItem.type && testItem.type === 'Cucumber' && testItem.cucumberScenario) {
        await createPage.selectTab('Test Details');
        await createPage.setTestType(testItem.type);
        await createPage.setCucumberScenario(testItem.cucumberScenario);
      }

      // Handle Linking Test Sets
      if (testItem.linkedTestSets && testItem.linkedTestSets.length > 0) {
          await createPage.selectTab('Test Sets'); 
          await createPage.linkTestSets(testItem.linkedTestSets);
      }

      // Handle Linking User Stories
      if (testItem.linkedUserStories && testItem.linkedUserStories.length > 0) {
          await createPage.selectTab('Link Issues'); 
          await createPage.linkUserStories(testItem.linkedUserStories);
      }

      // Submit: Uncheck "Create another" only if it's the last test
      const isLastTest = currentTestIndex === testsCount;
      await createPage.submit(isLastTest);
    });
  }
});
