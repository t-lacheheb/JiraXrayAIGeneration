
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { loadData } from '../tests/utils/data-loader';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);
const OLLAMA_API_URL = 'http://localhost:11434/api/generate';
const MODEL_NAME = 'llama3.1:8b';

async function fetchUserStory(issueKeyOrUrl: string) {
  const data = loadData();
  const baseURL = 'https://opm.ooredoo.dz'; // Hardcoded from config or read from config if possible
  
  let issueUrl = issueKeyOrUrl;
  if (!issueKeyOrUrl.startsWith('http')) {
    issueUrl = `${baseURL}/browse/${issueKeyOrUrl}`;
  }

  console.log(`Fetching User Story from: ${issueUrl}`);

  const browser = await chromium.launch({ headless: false }); // Headless false to see what's happening
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Login
    await page.goto(baseURL);
    await page.fill('input[name="os_username"]', data.credentials.username);
    await page.fill('input[name="os_password"]', data.credentials.password);
    await page.click('#login-form-submit, input[value="Log In"], button:has-text("Log In")');
    await page.waitForLoadState('networkidle');

    // Go to Issue
    await page.goto(issueUrl);
    await page.waitForSelector('#summary-val', { timeout: 10000 });

    // Extract Data
    const summary = await page.innerText('#summary-val');
    const description = await page.innerText('#description-val'); // This might need adjustment based on Jira version

    console.log(`Fetched Story: ${summary}`);
    return { summary, description, id: issueKeyOrUrl.split('/').pop() };

  } catch (error) {
    console.error('Error fetching user story:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function generateTestsWithOllama(story: { summary: string, description: string, id: string }) {
  const promptTemplatePath = path.join(process.cwd(), 'PROMPT_TEMPLATE.md');
  let promptTemplate = fs.readFileSync(promptTemplatePath, 'utf-8');

  // Remove the example usage part to save tokens/confusion if needed, or keep it.
  // For now, I'll append the user story to the end.

  const prompt = `${promptTemplate}

---
**User:**
> Given Data:
  type: Cucumber
  priority: Medium
  linkedUserStories: ["${story.id}"]

> User Story:
${story.summary}
${story.description}
`;

  console.log('Sending prompt to Ollama...');

  try {
    const response = await fetch(OLLAMA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_NAME,
        prompt: prompt,
        stream: false,
        format: "json" // Force JSON mode if model supports it
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API Error: ${response.statusText}`);
    }

    const jsonResponse: any = await response.json();
    console.log('Ollama Response received.');
    
    // Extract JSON from response (in case there's extra text, though "format: json" helps)
    let responseText = jsonResponse.response;
    
    // Attempt to parse
    try {
        const parsed = JSON.parse(responseText);
        return parsed.tests;
    } catch (e) {
        // Simple cleanup if markdown code blocks are present
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[1] || jsonMatch[0]).tests;
        }
        throw new Error("Failed to parse JSON from AI response");
    }

  } catch (error) {
    console.error('Error generating tests:', error);
    return [];
  }
}

async function main() {
  const issueKey = process.argv[2];
  if (!issueKey) {
    console.error('Please provide a Jira Issue Key or URL as an argument.');
    process.exit(1);
  }

  try {
    const story = await fetchUserStory(issueKey);
    const generatedTests = await generateTestsWithOllama(story as any);

    if (generatedTests && generatedTests.length > 0) {
      const dataPath = path.join(process.cwd(), 'data.json');
      const currentData = loadData();
      
      // Append or replace tests? Let's replace for this specific run, or append.
      // For safety, let's append but warn.
      // Actually, typically we want to set the tests to run.
      
      console.log(`Generated ${generatedTests.length} tests.`);
      
      currentData.tests = generatedTests; // Overwrite current tests to be created
      
      fs.writeFileSync(dataPath, JSON.stringify(currentData, null, 2));
      console.log('Updated data.json with new tests.');

      // Run Playwright tests
      console.log('Running Playwright tests to create issues in Jira...');
      try {
        const { stdout, stderr } = await execPromise('npx playwright test tests/create_tests.spec.ts');
        console.log('Playwright Output:\n', stdout);
        if (stderr) console.error('Playwright Errors:\n', stderr);
      } catch (testError: any) {
         console.error('Error running Playwright tests:', testError.message);
         if (testError.stdout) console.log(testError.stdout);
         if (testError.stderr) console.error(testError.stderr);
      }

    } else {
      console.log('No tests generated.');
    }

  } catch (error) {
    console.error(error);
  }
}

main();
