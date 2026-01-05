import { Page, expect } from '@playwright/test';

export class CreateIssuePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async openCreateModal() {
    // Click global create button (usually 'c' shortcut works too, but button is safer)
    await this.page.click('#create_link');
    await this.page.waitForSelector('#create-issue-dialog');
    await this.page.check('#qf-create-another');
  }

  async selectProject(projectKey: string) {
    const projectField = this.page.locator('#project-field');
    await projectField.click();
    await projectField.fill(projectKey);
    await projectField.press('Enter');
    // Wait for project to settle
    await this.page.waitForTimeout(1000); 
  }

  async selectIssueType(type: string) {
    const typeField = this.page.locator('#issuetype-field');
    await typeField.click();
    await typeField.fill(type);
    await typeField.press('Enter');
    // Wait for form to update based on issue type
    await this.page.waitForTimeout(2000); 
  }

  async fillSummary(summary: string) {
    await this.page.fill('#summary', summary);
  }

  async fillDescription(description: string) {
    // Description is often a rich text editor or simple text area
    // Trying generic text area first
    const descSelector = '#description';
    if (await this.page.isVisible(descSelector)) {
        await this.page.fill(descSelector, description);
    } else {
        // Fallback for rich text editors (TinyMCE) if needed
        // await this.page.frameLocator('iframe[id*="description"]').locator('body').type(description);
        console.log('Description field plain text area not found, check selector.');
    }
  }

  //Fill Componenet
  async fillComponents(components: string[]) {
    const componentsField = this.page.locator('#components-textarea');
    await componentsField.click();
    await componentsField.fill('');
    //Use for loop to add each component
    for (const component of components) {
      await componentsField.fill(component);
      await this.page.press('#components-textarea', 'Enter');
    }
    await this.page.waitForTimeout(2000); 
  }

  //Fill priority
  async fillPriority(priority: string) {
    const priorityField = this.page.locator('#priority-field');
    await priorityField.click();
    await priorityField.fill(priority);
    await priorityField.press('Enter');
    await this.page.waitForTimeout(2000); 
  }

  async submit(isLastToCreate: boolean = true) {
    if(isLastToCreate)
      await this.page.uncheck('#qf-create-another'); 
    await this.page.click('#create-issue-submit');
    // Wait for success flag or modal close
    await this.page.waitForSelector('.aui-message-success', { timeout: 10000 });
    //catch the message and print it in log
    const successMessage = await this.page.textContent('.aui-message-success');
    console.log(`Test Created Successfully: ${successMessage}`);
  }

  // --- Extended Xray Functionality (Tabs & Linking) ---

  async selectTab(tabName: string) {
    // Jira create screens often have tabs like "Field Tab", "Test Details", etc.
    // They are usually <a> tags inside a list
    const tabSelector = `ul.tabs-menu > li > a:has-text("${tabName}")`;
    if (await this.page.isVisible(tabSelector)) {
        await this.page.click(tabSelector);
        await this.page.waitForTimeout(500); // UI settle
    } else {
        console.warn(`Tab '${tabName}' not found. Check if it's visible on Create Screen.`);
    }
  }

    async setTestType(testType: string) {
    // Example: , Cucumber, Generic
    const selector = '#customfield_15113'; 
    try {
        await this.page.selectOption(selector, { label: testType });
        await this.page.waitForTimeout(2000); 
    } catch (e) {
        console.warn(`Could not set Test Type. Please update selector in CreateIssuePage.ts: ${selector}`);
    }
  }

  async setCucumberScenario(scenario: string) {
    // 1. Ensure "Cucumber" type is selected first (done via setTestType)
    // 2. Locate the "Cucumber Scenario" field. 
    // This is often a large text area or a rich editor.
    // Replace 'customfield_12345' with the actual ID for "Cucumber Scenario"
    const scenarioFieldId = '.ace_text-input'; 
    
    if (await this.page.isVisible(scenarioFieldId)) {
        await this.page.fill(scenarioFieldId, scenario);
        await this.page.waitForTimeout(500); 
    } else {
        // Sometimes it's inside an iframe or requires clicking a button "Edit Scenario"
        console.warn(`Cucumber Scenario field (${scenarioFieldId}) not found. Update selector.`);
    }
  }

  async linkTestSets(testSetKeys: string[]) {
    // If "Test Sets" is a tab or a field on the Create Screen:
    // This example assumes it's a multi-select field (like "Test Sets" custom field)
    const testSetsFieldId = '#customfield_15118-textarea'; //ace_text-input
    
    if (await this.page.isVisible(testSetsFieldId)) {
       for (const key of testSetKeys) {
           await this.page.fill(testSetsFieldId, key);
           await this.page.press(testSetsFieldId, 'Enter');
           await this.page.waitForTimeout(500);
       }
    } else {
        console.warn(`Test Sets field (${testSetsFieldId}) not found.`);
    }
  }

  async linkUserStories(issueKeys: string[]) {
     // Usually the "Link Issues" section
     // 1. Select "Link Issues" tab if needed
     // 2. Select Relationship (e.g., "tests")
     // 3. Select Issue
     
     // Checking for standard "Linked Issues" selector
     if (await this.page.isVisible('#issuelinks-linktype')) {
         await this.page.selectOption('#issuelinks-linktype', { label: 'tests' }); // or "relates to"
     }
     try {
      const linkField = this.page.locator('#issuelinks-issues-textarea'); // Often a text area for keys
      if (await linkField.isVisible()) {
          for (const key of issueKeys) {
              await linkField.fill(key);
              await linkField.press('Enter');
          }
      } else {
          // Some Jiras use a picker
          const picker = this.page.locator('#issuelinks-issues-multi-select');
          if (await picker.isVisible()) {
              for (const key of issueKeys) {
                  await picker.type(key);
                  await picker.press('Enter');
              }
          }
      }
     } catch (e) {
         console.warn(`Could not find Linked Issues field. Check selector.`);
     }
     
  }
}
