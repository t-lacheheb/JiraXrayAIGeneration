# Jira Xray Automation with Playwright

This project provides templates for automating daily Jira Xray tasks.

## Setup

1.  **Install Node.js**: Ensure Node.js is installed.
2.  **Install Dependencies**:
    ```bash
    npm install
    npx playwright install
    ```
3.  **Configure Data**:
    Edit `data.json` with your:
    *   Jira URL
    *   Credentials (use environment variables for security in real usage!)
    *   Project Key
    *   Test data (Tests, Sets, Plans, Executions)

## Critical: Updating Selectors

Since I cannot access your internal Jira instance, the selectors in `tests/pages/` are **generic**. You **MUST** inspect your Jira page and update them.

### `tests/pages/LoginPage.ts`
*   Update `input[name="os_username"]` and `input[name="os_password"]` if your login form is different.

### `tests/pages/CreateIssuePage.ts`
*   **Xray Fields**: Xray uses custom fields (e.g., `customfield_12345`).
*   **Action**: Open Jira, click "Create", and inspect the "Test Type", "Test Set", etc. fields using Chrome DevTools.
*   Update the IDs in `CreateIssuePage.ts` accordingly.

## Running the Automation

To create tests defined in `data.json`:
```bash
npx playwright test tests/create_tests.spec.ts
```

To create test sets:
```bash
npx playwright test tests/create_test_sets.spec.ts
```

...and so on.

## Visual Mode
To see what's happening and debug selectors:
```bash
npx playwright test --ui
```
