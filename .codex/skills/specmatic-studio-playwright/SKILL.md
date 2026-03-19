---
name: specmatic-studio-playwright
description: Use when working in the specmatic-studio-playwright-ts-tests repo to add or update Playwright tests, page objects, screenshots, Applitools visual checks, or Specmatic Studio test data. Covers this project's file layout, fixture usage, and repo-specific test authoring conventions.
---

# Specmatic Studio Playwright

Use this skill when changing tests or page objects in this repository.

## Quick map

- `specs/` contains the Playwright specs, grouped by product area such as `openapi/`, `proxy/`, `soap/`, `async/`, and `config/`.
- `page-objects/` contains the UI abstractions. New UI behavior usually belongs here, not inline in specs.
- `specmatic-studio-demo/specs/` contains the sample contracts, examples, WSDLs, and proxy artifacts that tests interact with.
- `utils/eyesFixture.ts` defines the custom Playwright fixture for Applitools and should be the default import source for visual-capable tests.
- `utils/screenshotUtils.ts` is the shared screenshot helper and also triggers Eyes checks when an `eyes` instance is passed.
- `playwright.config.ts` loads `env/.env.<ENV_NAME>`, runs with `workers: 1`, and can optionally boot Docker with `USE_DOCKER=true`.

## Working conventions

### Specs

- Prefer placing new tests under the existing domain folder in `specs/`.
- Use `import { test, expect } from "../../../utils/eyesFixture";` when the spec may use Applitools or should match the repo's default test fixture behavior.
- Keep orchestration in specs light. Specs should mostly compose page-object methods and `test.step(...)` blocks.
- Tags matter. Visual checks only run when both `ENABLE_VISUAL=true` and the test has the `@eyes` tag.

### Page objects

- Follow the existing constructor pattern: `(page, testInfo, eyes, ...optionalContext)`.
- Reuse `BasePage` when the page participates in the main Specmatic Studio workflow.
- Add selectors as fields and keep user actions/assertions as named methods.
- If behavior already exists in another page object, extend or mirror that pattern instead of inventing a new style.

### Screenshots and visual validation

- Use `takeAndAttachScreenshot(page, name)` for normal evidence capture.
- Pass `eyes` only when the step should perform Applitools validation.
- In this repo, screenshots are often taken without visual validation; do not automatically pass `this.eyes` unless the flow explicitly opts in.
- Example: `ensureSidebarOpen(withVisualValidation = false)` now passes `this.eyes` only when requested.

### Test data and contracts

- When a test depends on a contract file, prefer reusing or extending files under `specmatic-studio-demo/specs/` rather than inventing a parallel fixture layout.
- Keep spec names centralized in `specs/specNames.ts` when they are reused across tests.

## Safe workflow

1. Read the relevant spec, page object, and helper before editing.
2. Keep new behavior in page objects or helpers; keep specs declarative.
3. Use the shared screenshot helper for observable UI state changes.
4. If a step is supposed to be visually validated, ensure the spec uses `eyesFixture`, includes `@eyes`, and passes `eyes` intentionally.
5. Run the narrowest Playwright command that covers the change.

## Commands

- Run all tests: `npx playwright test`
- Run one spec: `npx playwright test specs/path/to/file.spec.ts`
- Run by tag: `npm run test:tag -- @tagName`
- Run local env explicitly: `npm run test:local`
- Run CI env locally: `npm run test:ci`
- Open report: `npx playwright show-report`
- Regenerate agent metadata: `./scripts/generate_openai_yaml.sh --interface 'display_name=Specmatic Studio Playwright' --interface 'short_description=Work on Specmatic Studio Playwright tests' --interface 'default_prompt=Use $specmatic-studio-playwright to add or update Specmatic Studio Playwright tests in this repository.'`
- Validate the skill: `./scripts/quick_validate.sh`

## Things to notice before editing

- `playwright.config.ts` throws if the expected env file is missing.
- The suite runs with a single worker, so avoid changes that assume multi-worker isolation has already been solved.
- `utils/eyesFixture.ts` disables Eyes automatically for CI non-main branches and for tests without `@eyes`.
- `takeAndAttachScreenshot` always attaches a Playwright screenshot, then optionally runs an Eyes check.
- The bundled helper scripts expect the repo-local `PyYAML` install at `.codex/vendor`.

## When updating an existing flow

- Preserve existing screenshot names unless there is a good reason to rename them.
- Preserve tags unless behavior or coverage is intentionally changing.
- Prefer small, targeted edits because page objects are reused across many specs.
