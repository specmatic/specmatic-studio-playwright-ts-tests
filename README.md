# Specmatic Playwright TypeScript Tests

This project contains automated end-to-end tests using [Playwright](https://playwright.dev/) and TypeScript, designed to work with [Specmatic](https://specmatic.in/) for contract-driven testing.

## Project Structure

- `specs/` - Contains Playwright test specs (e.g., `example.spec.ts`).
- `playwright.config.ts` - Playwright configuration file.
- `package.json` - Project dependencies and scripts.
- `playwright-report/` - Generated Playwright HTML reports.
- `test-results/` - Raw test result files.

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or above recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

Install dependencies:

```bash
npm install
# or
yarn install
```

#### Installing Playwright agents in VS Code:

```bash
npx playwright init-agents --loop=vscode
```

## Using the Codex Skill

This repo includes a Codex skill for working on these Playwright tests:
`$specmatic-studio-playwright`

Use it explicitly in a prompt when you want Codex to follow this repo's testing, page-object, screenshot, and visual-validation conventions.

Example prompts:

```text
Use $specmatic-studio-playwright to add a new OpenAPI test that saves a valid spec and verifies the success flow.

Use $specmatic-studio-playwright to refactor screenshot handling so Applitools validation only runs when explicitly requested.

Use $specmatic-studio-playwright to add an @eyes visual test for the example generation flow.

Use $specmatic-studio-playwright to create a page-object method for opening the right sidebar and asserting a process bar is visible.

Use $specmatic-studio-playwright to review this Playwright spec and align it with the repo's page-object and screenshot conventions.
```

You can also ask naturally without naming the skill, but mentioning
`$specmatic-studio-playwright` makes the intended guidance much more reliable.

### Running Tests

To run all Playwright end-to-end tests.
```bash
npx playwright test
```

To run a specific test file:
```bash
npx playwright test tests/example.spec.ts
```

Runs the tests in a specific file.
```bash
  npx playwright test example
```    

Starts the interactive UI mode.
```bash
  npx playwright test --ui
```
    
Runs the tests only on Desktop Chrome.
```bash
  npx playwright test --project=chromium
```    

Runs the tests in debug mode.
```bash
  npx playwright test --debug
```

Auto generate tests with Codegen.
```bash
  npx playwright codegen
```

### Running Against a Specmatic Studio Jar

If `SPECMATIC_STUDIO_JAR_URL` is set, the test run will start Specmatic
Studio from that jar instead of using Docker.

```bash
SPECMATIC_STUDIO_JAR_URL="https://repo.example.com/executable-all-1.8.1.jar" \
SPECMATIC_STUDIO_JAR_OVERWRITE=false \
npx playwright test
```

What happens in jar mode:

- The jar is downloaded into the OS temp directory and reused on later runs.
- Set `SPECMATIC_STUDIO_JAR_OVERWRITE=true` to force a fresh download.
- The test run starts `java -jar <downloaded-jar> studio --port 9000`.
- Playwright uses `http://127.0.0.1:9000/_specmatic/studio` as the `BASE_URL` for the run.
- If Java is not installed or `java` is not available on `PATH`, the run fails with a clear error.
- If port `9000` is already in use, the run fails with a clear error.
- Global teardown stops the Java process after the tests complete.

### Running Tests by Tag

To run tests with a specific tag (e.g., `@dashboard-overview`), use the following npm script:

```bash
npm run test:tag -- @dashboard-overview
```

> **Note:** The `--` is required to forward the tag argument to Playwright. This will run only the tests annotated with the specified tag.

You can also use any other tag, such as `@admin`, in the same way:

```bash
npm run test:tag -- @admin
```

To run tests with a specific tag using npx (no npm script required):

```bash
npx playwright test --grep @dashboard-overview
```

You can use any tag, for example:

```bash
npx playwright test --grep @admin
```

### Viewing Reports

After running tests, view the HTML report:

```bash
npx playwright show-report
```

The report will open in your default browser.

## Integrating with Specmatic

This project is intended to be used alongside Specmatic for contract-driven testing. Refer to the [Specmatic documentation](https://specmatic.in/docs/) for integration steps and best practices.

## Useful Links
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Specmatic Documentation](https://specmatic.in/docs/)

## License

MIT
