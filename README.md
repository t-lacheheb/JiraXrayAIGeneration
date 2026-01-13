# Playwright + Jira Xray + AI Test Generation

Tags: Playwright, Jira Xray, Xray Cloud, Test Automation, QA, BDD, Cucumber, AI, LLM, OpenAI, Ollama

Automate Jira Xray tests from real User Stories. Fetch a story, generate Cucumber scenarios with AI (Ollama or OpenAI), and publish Tests and Test Sets to Jira using Playwright — all from the CLI.

## Core Features
- AI-generated Cucumber scenarios directly from Jira User Stories
- Creates both Xray Tests and Test Sets, and links them together
- Two-step CLI workflow for reviewable generation or full automation
- Works with local LLMs via Ollama or cloud models via OpenAI
- Secure configuration via `.env` and minimal JSON config
- Headed/Headless Playwright execution with robust error reporting
- Strict Gherkin enforcement to avoid parser errors (DocStrings supported)

## How It Works
- Fetch: Logs into Jira and opens the User Story page using Playwright [LoginPage.ts](file:///Users/tarek/WorkSpace/playwright/tests/pages/LoginPage.ts).
- Generate: Sends the story to AI using the structured prompt [PROMPT_TEMPLATE.md](file:///Users/tarek/WorkSpace/playwright/PROMPT_TEMPLATE.md), then parses the JSON in [generate_tests.ts](file:///Users/tarek/WorkSpace/playwright/scripts/generate_tests.ts).
- Persist: Saves output as `Projects/<PROJECT>/<ISSUE>.json`.
- Publish: Creates Xray Test Sets and Tests via Playwright specs [create_test_sets.spec.ts](file:///Users/tarek/WorkSpace/playwright/tests/create_test_sets.spec.ts) and [create_tests.spec.ts](file:///Users/tarek/WorkSpace/playwright/tests/create_tests.spec.ts), linking to Stories and Sets.

## Quick Start
```bash
npm install
npx playwright install
```

Create `.env` (only credentials, no Jira URLs or project keys):
```env
JIRA_USERNAME=your_email@example.com
JIRA_PASSWORD=your_api_token_or_password
OPENAI_API_KEY=sk-...
```

Configure [config.json](file:///Users/tarek/WorkSpace/playwright/config.json):
- jira.baseUrl, jira.projectKeyDefault
- ai.provider (`ollama` or `openai`), ai.baseUrl, ai.model

## CLI: Three Modes

### 1) Full Automation – for fast end‑to‑end creation
Developer or tester wants everything in one shot: fetch the story, let AI generate tests, then immediately create Xray Test Set + Tests in Jira.

Command:
```bash
npm run generate-tests -- <ISSUE_KEY> [PROJECT_KEY]
# Example:
npm run generate-tests -- SNAPS-1571 XTP
```
What it does:
- Logs into Jira and opens the User Story `<ISSUE_KEY>`
- Sends the story to the AI provider and generates a Test Set + Tests
- Saves them to `Projects/<PROJECT_KEY>/<ISSUE_KEY>.json`
- Runs the Playwright flows to create the Test Set and Tests in Jira Xray

Use when:
- You trust the AI output and just want Jira populated quickly.

### 2) Generate Only – for reviewing AI output before creation
Developer or test lead wants to review or tweak the generated tests before creating anything in Jira.

Command:
```bash
npm run generate-tests -- FILE <ISSUE_KEY> [PROJECT_KEY]
# Example:
npm run generate-tests -- FILE SNAPS-1571 XTP
```
What it does:
- Fetches the User Story from Jira
- Uses AI to generate the Test Set and Tests
- Writes result to `Projects/<PROJECT_KEY>/<ISSUE_KEY>.json`
- **Does not** create any issues in Jira

Next step (after review/edit of the JSON file):
- Commit changes if you want history of the test design.
- Use the JIRA mode to actually create the issues.

Use when:
- You want human review of the test design.
- You need to adjust Cucumber steps or priorities before pushing to Jira.

### 3) Execute Only – for creating Jira issues from an existing file
Tester or CI job uses a prepared JSON file (either AI‑generated or hand‑crafted) to create Xray Test Set and Tests.

Command:
```bash
npm run generate-tests -- JIRA <ISSUE_KEY> [PROJECT_KEY]
# Example:
npm run generate-tests -- JIRA SNAPS-1571 XTP
```
What it does:
- Reads `Projects/<PROJECT_KEY>/<ISSUE_KEY>.json`
- Creates/updates the Xray Test Set(s)
- Creates/updates the Xray Tests and links them to:
  - The Test Set(s)
  - The User Story in `linkedUserStories`

Use when:
- You already have a JSON file (from FILE mode or manual editing).
- You want to run this in CI/CD to sync tests into Jira.

## AI Providers
- Ollama
  - ai.provider: `ollama`
  - ai.baseUrl: `http://localhost:11434`
  - Model: `llama3.1:8b` (example)
- OpenAI
  - ai.provider: `openai`
  - ai.baseUrl: `https://api.openai.com`
  - Requires `OPENAI_API_KEY` in `.env`

## Data Format
AI returns a single JSON object containing a Test Set and Tests:
```json
{
  "testSets": [
    {
      "summary": "Test Set for SNAPS-1571",
      "description": "Auto-generated test set for User Story SNAPS-1571",
      "linkedUserStories": ["SNAPS-1571"]
    }
  ],
  "tests": [
    {
      "summary": "Display eligibility message for 2G/3G",
      "description": "Verify popup copy for 2G/3G identification",
      "type": "Cucumber",
      "priority": "High",
      "linkedUserStories": ["SNAPS-1571"],
      "linkedTestSets": [],
      "cucumberScenario": "Given the user is on the home page\nWhen the user enters a valid 2G/3G MSISDN\nThen I should see the message:\n\"\"\"\nSwitch to 5G and get 50GO of Internet...\n\"\"\""
    },
  ]
}
```
Note: When linking Tests to Test Sets, the runner uses IDs created during Test Set creation. If `linkedTestSets` is empty, it falls back to IDs in `data.testSets`. See the linking logic in [create_tests.spec.ts](file:///Users/tarek/WorkSpace/playwright/tests/create_tests.spec.ts#L65-L82).

## Troubleshooting
- Gherkin parse errors (unexpected plain text)
  - Use DocStrings for multi-line messages. The prompt enforces this via [PROMPT_TEMPLATE.md](file:///Users/tarek/WorkSpace/playwright/PROMPT_TEMPLATE.md).
- OpenAI key conflicts
  - If your shell has a wrong key set: `unset OPENAI_API_KEY`
  - Then export or use `.env` to load the correct key.
- Jira selectors
  - Inspect your instance and adapt fields in [CreateIssuePage.ts](file:///Users/tarek/WorkSpace/playwright/tests/pages/CreateIssuePage.ts).

## Visual Mode
```bash
npx playwright test --ui
```

## Why This Project
- Accelerates test authoring by turning user stories into runnable tests
- Standardizes Tests and Test Sets in Jira Xray
- Offers reviewable AI output before creation
- Integrates with both local and cloud AI providers
