# Playwright test code smells and rewrite opportunities

This is an analysis-only review of the Playwright test code, grounded in the failures catalogued in [orchestrator-run-data/failure-causes.md](failure-causes.md). The main theme is that some tests read transient UI state immediately or hide failed waits, making it hard to distinguish a timing race from a real Studio regression. The failure reports contain both kinds of clues; a test rewrite should make product failures clearer, not make them pass by weakening expectations.

## Highest-priority findings

| Smell | Code reference | Why it hurts | Related orchestrator evidence and cause |
|---|---|---|---|
| Read validation text immediately after expanding its panel | [`invalid-spec-save.spec.ts`](https://github.com/specmatic/specmatic-studio-playwright-ts-tests/blob/codex/orchestrator-gate-analysis-ci-skip/specs/openapi/update-service-spec/invalid-spec-save.spec.ts#L47) and [`ServiceSpecConfigPage.expandAndGetValidationError()`](https://github.com/specmatic/specmatic-studio-playwright-ts-tests/blob/codex/orchestrator-gate-analysis-ci-skip/page-objects/service-spec-config-page.ts#L456) | The helper clicks, screenshots, then reads `innerText()` once. It does not verify expansion or wait for visible/non-empty error content. Empty text therefore conflates a delayed render, a failed expand interaction, and missing product feedback. | **OpenAPI invalid-spec feedback is blank:** builds [#893](https://github.com/specmatic/specmatic-studio-playwright-ts-tests/actions/runs/42256607175), [#900](https://github.com/specmatic/specmatic-studio-playwright-ts-tests/actions/runs/42887080257), [#901](https://github.com/specmatic/specmatic-studio-playwright-ts-tests/actions/runs/42897210276), and [#917](https://github.com/specmatic/specmatic-studio-playwright-ts-tests/actions/runs/43172946672); persistent through #917. See [cause row](failure-causes.md#L6). |
| Treat mock-server start as complete after clicking | [`MockServerPage.startMockServer()`](https://github.com/specmatic/specmatic-studio-playwright-ts-tests/blob/codex/orchestrator-gate-analysis-ci-skip/page-objects/mock-server-page.ts#L173) and [`getMockURL()`](https://github.com/specmatic/specmatic-studio-playwright-ts-tests/blob/codex/orchestrator-gate-analysis-ci-skip/page-objects/mock-server-page.ts#L200) | Start clicks the toggle and returns without asserting the running state. URL extraction does wait for text, but only reports a timeout after ten seconds; it does not identify whether startup failed or the info message failed to render. | **SOAP Mock info URL blank:** [#901](https://github.com/specmatic/specmatic-studio-playwright-ts-tests/actions/runs/42897210276). Its artifact shows `.info-message-box` stayed empty through repeated polling. See [cause row](failure-causes.md#L7). This is a product/UI signal as well as a synchronization opportunity, not confirmed flakiness. |
| Fixed sleeps substitute for observable state | [`SideBarPage.closeSidebar()`](https://github.com/specmatic/specmatic-studio-playwright-ts-tests/blob/codex/orchestrator-gate-analysis-ci-skip/page-objects/side-bar-page.ts#L104), [`update-service-spec.spec.ts`](https://github.com/specmatic/specmatic-studio-playwright-ts-tests/blob/codex/orchestrator-gate-analysis-ci-skip/specs/openapi/update-service-spec/update-service-spec.spec.ts#L17), [`save-async-spec.spec.ts`](https://github.com/specmatic/specmatic-studio-playwright-ts-tests/blob/codex/orchestrator-gate-analysis-ci-skip/specs/async/update-service-spec/save-async-spec.spec.ts#L17), and [`MockServerPage.getDrillDownState()`](https://github.com/specmatic/specmatic-studio-playwright-ts-tests/blob/codex/orchestrator-gate-analysis-ci-skip/page-objects/mock-server-page.ts#L386) | Sleeps of 60–1000 ms are machine-speed guesses: too short on a loaded runner and wasted time when the UI is ready sooner. The sidebar helper also writes `aria-expanded` with `page.evaluate()` instead of exercising the user control, so it can report a state the app did not reach through its normal behavior. | The pattern makes readiness failures such as [AsyncAPI examples #913](https://github.com/specmatic/specmatic-studio-playwright-ts-tests/actions/runs/43019002912) harder to diagnose; that cause also appeared in [#847](https://github.com/specmatic/specmatic-studio-playwright-ts-tests/actions/runs/38704016488) and [#855](https://github.com/specmatic/specmatic-studio-playwright-ts-tests/actions/runs/39423684138). See [AsyncAPI cause row](failure-causes.md#L8). |
| Swallow locator/read errors and fall back to non-retrying checks | [`run-suite-v3-config.spec.ts`](https://github.com/specmatic/specmatic-studio-playwright-ts-tests/blob/codex/orchestrator-gate-analysis-ci-skip/specs/config/service-spec-config/run-suite-v3-config.spec.ts#L179) and [`assertExecutionDropDown()`](https://github.com/specmatic/specmatic-studio-playwright-ts-tests/blob/codex/orchestrator-gate-analysis-ci-skip/specs/config/service-spec-config/run-suite-v3-config.spec.ts#L191) | `.catch(() => "")` turns a missing/detached locator into an ordinary string mismatch. Catching a retrying assertion and then reading once loses the timeout’s useful state history, while soft assertions let later steps run in a known-bad state. | These are general diagnostics/readiness smells; they are not identified as the cause of a specific row in the current failure archive. Apply them where UI state is asynchronous, but do not infer they caused the archived product assertions. |
| Count drill-downs globally and check only the ends | [`run-soap-mock-server.spec.ts`](https://github.com/specmatic/specmatic-studio-playwright-ts-tests/blob/codex/orchestrator-gate-analysis-ci-skip/specs/soap/run-mock-server/run-soap-mock-server.spec.ts#L89), [`MockServerPage` locators](https://github.com/specmatic/specmatic-studio-playwright-ts-tests/blob/codex/orchestrator-gate-analysis-ci-skip/page-objects/mock-server-page.ts#L89), and [`getDrillDownState()`](https://github.com/specmatic/specmatic-studio-playwright-ts-tests/blob/codex/orchestrator-gate-analysis-ci-skip/page-objects/mock-server-page.ts#L374) | The page object counts every `drill-down` on the page; the test only requires at least one and inspects the first and last. Hidden/stale screens can contaminate the count, while a broken middle result goes unchecked. | General coverage weakness, not the direct cause of the #901 blank URL failure. The SOAP Mock flow is in [#901](https://github.com/specmatic/specmatic-studio-playwright-ts-tests/actions/runs/42897210276). |
| Retry diagnostics are configured so CI failures get no retry trace | [`playwright.config.ts`](https://github.com/specmatic/specmatic-studio-playwright-ts-tests/blob/codex/orchestrator-gate-analysis-ci-skip/playwright.config.ts#L80) | CI retries are set to zero, but trace capture is `on-first-retry` at [line 91](https://github.com/specmatic/specmatic-studio-playwright-ts-tests/blob/codex/orchestrator-gate-analysis-ci-skip/playwright.config.ts#L91). That combination provides no Playwright retry trace for a CI failure. Retries should not mask failures, but failure-retained traces make race-vs-product triage much easier. | The blank feedback failures (#901 and #917) would benefit from a trace showing the click, network response, and rendered panel. The current archive has screenshots and job logs, but this configuration does not retain a trace on the first failure. |

## Example rewrites

### Validation details: wait for expanded state and assert the locator

The current test reads the returned string immediately. A better contract for the helper is to expand idempotently, wait for the expanded state and visible panel, and return the locator so the test can use Playwright's retrying text assertion:

```ts
async expandValidationError(): Promise<Locator> {
  if ((await this.validationErrorBtn.getAttribute("aria-expanded")) !== "true") {
    await this.validationErrorBtn.click();
  }
  await expect(this.validationErrorBtn).toHaveAttribute("aria-expanded", "true");
  await expect(this.errorContent).toBeVisible();
  return this.errorContent;
}
```

```ts
const errorContent = await configPage.expandValidationError();
await expect(errorContent).toContainText(
  /could not parse contract|implicit keys need to be on a single line/i,
);
```

If the assertion still times out with an expanded visible panel, report the empty/incorrect message as a Studio defect. Don’t accept blank text or increase a timeout without evidence.

### Mock start: assert state transition before consuming the URL

```ts
await this.mockToggleButton.click();
await expect(this.mockToggleButton).toHaveAttribute("data-running", "true");
await expect(this.infoMessageBox).toContainText(/https?:\/\//);
```

The running-state assertion localizes startup failures; the URL assertion separately checks the UI feedback contract. If the toggle can already be running, keep the helper idempotent and assert the same final state in both branches.

### Logs/status: use retrying locator expectations, preserve errors

Instead of reading a log once and converting all errors to an empty string:

```ts
for (const line of expectedLogLines) {
  await expect(configPage.executionLog).toContainText(line);
}
```

Likewise, keep one retrying assertion for the state/status. Avoid catching its timeout and taking an immediate snapshot that can only repeat the failure with less context.

### Sidebar and other transitions: exercise the UI, then wait for the result

Use the real sidebar toggle control, then assert its accessible/ARIA state or that the sidebar is hidden. Remove the fixed one-second sleep. For editor/save screenshot checkpoints, wait for a meaningful state such as the expected editor value or save button state instead of sleeping for 300 ms.

### Drill-downs: scope to the active result and assert intended cases

Scope the drill-down locator to the active mock result view. Name the expected scenario/path and assert its request and response blocks, rather than trusting a global count and sampling only first/last entries. If all rows matter, assert all expected scenario titles and statuses; if only representative cases matter, make the sampled cases explicit.

## Other patterns to review

- [`rename-generated-examples.spec.ts`](https://github.com/specmatic/specmatic-studio-playwright-ts-tests/blob/codex/orchestrator-gate-analysis-ci-skip/specs/openapi/examples/rename-generated-examples.spec.ts#L35) uses immediate `fs.existsSync()` checks after UI-driven mutations at lines 44–45 and 106–107. Poll the filesystem condition when the operation is asynchronous, as the same test already does for the UI file list.
- [`ServiceSpecConfigPage` locator construction](https://github.com/specmatic/specmatic-studio-playwright-ts-tests/blob/codex/orchestrator-gate-analysis-ci-skip/page-objects/service-spec-config-page.ts#L61) uses broad `.screen` filtering, `.first()`, global alert selectors, and dynamic substring selectors for validation elements. Prefer scoping to a unique screen/spec locator and accessible roles or stable test IDs; `.first()` should express a known UI rule, not silence ambiguity.
- The SOAP mock spec combines server startup, contract-test execution, summary validation, drill-downs, header checks, and filter checks in one test ([spec file, lines 25 onward](https://github.com/specmatic/specmatic-studio-playwright-ts-tests/blob/codex/orchestrator-gate-analysis-ci-skip/specs/soap/run-mock-server/run-soap-mock-server.spec.ts#L25)). This is a useful end-to-end journey, but failures early in the flow prevent later checks from running. Keep the journey if it tests a user-critical path; otherwise split independent behavior behind shared setup with isolated assertions.

## Interpretation

The archived sample does not support calling every UI failure “flaky.” The blank OpenAPI/SOAP feedback assertions recur and may reflect a real UI feedback defect. The AsyncAPI row-readiness failures have a prior Playwright wait change in PR #52 but recurred in #913, so that test-side fix was not sufficient. The OpenAPI mock readiness issue in #853 and examples-details issue in #883 have test-side readiness changes with no same-pattern recurrence in this 30-day sample. See the linked cause rows for history and limits.

This report is a code review and rewrite proposal only; no test or application files were changed.
