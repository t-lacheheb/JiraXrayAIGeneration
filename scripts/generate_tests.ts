
import dotenv from 'dotenv';
dotenv.config({ override: true });
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import { loadConfig } from '../config_helper';
import { LoginPage } from '../tests/pages/LoginPage';
 

const execPromise = util.promisify(exec);
const config = loadConfig();

async function fetchUserStory(issueKeyOrUrl: string) {
  const baseURL =  config.jira.baseUrl;
  const username = process.env.JIRA_USERNAME;
  const password = process.env.JIRA_PASSWORD;
  
  if (!username || !password) {
    throw new Error('Jira credentials not found in environment variables (JIRA_USERNAME, JIRA_PASSWORD)');
  }

  let issueUrl = issueKeyOrUrl;
  if (!issueKeyOrUrl.startsWith('http')) {
    issueUrl = `${baseURL}/browse/${issueKeyOrUrl}`;
  }

  console.log(`Fetching User Story from: ${issueUrl}`);

  const browser = await chromium.launch({ headless: false }); // Headless false to see what's happening
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Login : use pages/loginPage
    await page.goto(issueUrl);
    const loginPage = new LoginPage(page);
    await loginPage.login(username as string, password as string);
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
    const response = await fetch(`${config.ai.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.ai.model,
        prompt: prompt,
        stream: false,
        format: "json" 
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API Error: ${response.statusText}`);
    }

    const jsonResponse: any = await response.json();
    console.log('Ollama Response received.');
    
    let responseText = jsonResponse.response;
    
    try {
        const parsed = JSON.parse(responseText);
        return parsed; 
    } catch (e) {
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
            return parsed;
        }
        throw new Error("Failed to parse JSON from AI response");
    }

  } catch (error) {
    console.error('Error generating tests:', error);
    return { tests: [], testSets: [] };
  }
}

async function generateTestsWithOpenAI(story: { summary: string, description: string, id: string }) {
  const promptTemplatePath = path.join(process.cwd(), 'PROMPT_TEMPLATE.md');
  const promptTemplate = fs.readFileSync(promptTemplatePath, 'utf-8');
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) throw new Error('Missing API key in env: OPENAI_API_KEY');

  const userContent = `${promptTemplate}

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

  console.log(`Sending prompt to OpenAI (${config.ai.model})...`);

  try {
    const response = await fetch(`${config.ai.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: config.ai.model,
        messages: [
          { role: 'system', content: 'You are an expert QA Automation Engineer. You output strictly valid JSON.' },
          { role: 'user', content: userContent }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API Error: ${response.status} - ${errText}`);
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    return parsed;
  } catch (error) {
     console.error('Error generating tests with OpenAI:', error);
     return { tests: [], testSets: [] };
  }
}

async function generateTestsWithAI(story: { summary: string, description: string, id: string }) {
  if (config.ai.provider === 'openai') {
    return generateTestsWithOpenAI(story);
  }
  return generateTestsWithOllama(story);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage:');
    console.error('  npm run generate-tests -- <ISSUE_KEY> [PROJECT_KEY]        (Fetch -> Generate -> Execute)');
    console.error('  npm run generate-tests -- FILE <ISSUE_KEY> [PROJECT_KEY]   (Fetch -> Generate only)');
    console.error('  npm run generate-tests -- JIRA <ISSUE_KEY> [PROJECT_KEY]   (Execute from existing file)');
    process.exit(1);
  }

  const modeArg = args[0].toUpperCase();
  let mode = 'ALL';
  let issueKey = args[0];
  let projectKey = args[1] || config.jira.projectKeyDefault;

  if (modeArg === 'FILE') {
    mode = 'FILE';
    issueKey = args[1];
    projectKey = args[2] || config.jira.projectKeyDefault;
  } else if (modeArg === 'JIRA') {
    mode = 'JIRA';
    issueKey = args[1];
    projectKey = args[2] || config.jira.projectKeyDefault;
  }

  if (!issueKey) {
    console.error('Error: Issue Key is required.');
    process.exit(1);
  }

  // Define paths
  const projectDir = path.join(process.cwd(), 'Projects', projectKey);
  // We don't know the exact ID until we fetch in FILE/ALL mode, but for JIRA mode we assume ID matches Key or we find it.
  // Actually, let's assume the filename matches the Issue Key for simplicity in JIRA mode,
  // or we rely on the logic that FILE/ALL mode saves it as `story.id.json`.
  // If `issueKey` is a URL, this might be tricky. Let's assume input is Key or URL.
  
  // Logic for FILE or ALL (Generation Phase)
  if (mode === 'FILE' || mode === 'ALL') {
    try {
      console.log(`\n=== Step 1: Fetching & Generating Tests for ${issueKey} ===`);
      const story = await fetchUserStory(issueKey);
      const generatedData = await generateTestsWithAI(story as any);
      const generatedTests = generatedData.tests || [];
      const generatedTestSets = generatedData.testSets || [];

      if ((generatedTests && generatedTests.length > 0) || (generatedTestSets && generatedTestSets.length > 0)) {
        if (!fs.existsSync(projectDir)) {
          fs.mkdirSync(projectDir, { recursive: true });
        }

        const dataPath = path.join(projectDir, `${story.id}.json`);
        
        console.log(`Generated ${generatedTests.length} tests and ${generatedTestSets.length} test sets.`);
        const filePayload = { tests: generatedTests, testSets: generatedTestSets };
        fs.writeFileSync(dataPath, JSON.stringify(filePayload, null, 2));
        console.log(`Saved test data to: ${dataPath}`);
        
        if (mode === 'FILE') {
           console.log(`\nGeneration complete. To create issues in Jira, run:\n npm run generate-tests -- JIRA ${story.id} ${projectKey}`);
        }

      } else {
        console.log('No tests generated from AI.');
        if (mode === 'ALL') {
            console.log('Skipping execution phase.');
            return;
        }
      }
    } catch (error) {
      console.error('Error during generation:', error);
      process.exit(1);
    }
  }

  // Logic for JIRA or ALL (Execution Phase)
  if (mode === 'JIRA' || mode === 'ALL') {
    try {
      // In ALL mode, we might have just created the file.
      // We need to resolve the file path.
      // If we came from FILE/ALL, we know the ID from `story.id`.
      // But if we are in JIRA mode, we only have `issueKey` argument.
      // We'll assume the file is named `${issueKey}.json` or we might need to handle URL inputs better.
      // For now, assume if mode is JIRA, issueKey IS the ID (e.g. SNAPS-1571).
      
      let targetId = issueKey;
      // If issueKey contains '/', it's a URL, extract ID
      if (targetId.includes('/')) {
        targetId = targetId.split('/').pop() || targetId;
      }

      const dataPath = path.join(projectDir, `${targetId}.json`);

      if (!fs.existsSync(dataPath)) {
        console.error(`Error: Data file not found at ${dataPath}`);
        console.error('Run with FILE mode first to generate tests.');
        process.exit(1);
      }

      console.log(`\n=== Step 2: Creating Jira Issues from ${dataPath} ===`);
      
      console.log('Running Playwright test sets to create issues in Jira...');
      await runPlaywrightTest('test_sets', dataPath, projectKey);

      console.log('Running Playwright tests to create issues in Jira...');
      await runPlaywrightTest('tests', dataPath, projectKey);

    } catch (error) {
      console.error('Error during execution:', error);
      process.exit(1);
    }
  }
}

main();
async function runPlaywrightTest(issueType: string, dataPath: string, projectKey: string) {
  try {
    const { stdout, stderr } = await execPromise(`npx playwright test tests/create_${issueType}.spec.ts`, { env: { ...process.env, dataPath, projectKey } });
    console.log(`Playwright Output for ${issueType}:\n`, stdout);
    if (stderr) console.error(`Playwright Errors for ${issueType}:\n`, stderr);
  } catch (testError: any) {
     console.error(`Error running Playwright ${issueType} :`, testError.message);
     if (testError.stdout) console.log(testError.stdout);
     if (testError.stderr) console.error(testError.stderr);
  }
}
