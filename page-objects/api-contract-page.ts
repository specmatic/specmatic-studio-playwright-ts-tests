import { test, Locator, expect, type TestInfo, Page } from "@playwright/test";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";
import { BasePage } from "./base-page";
import { OpenAPISpecTabPage } from "./openapi-spec-tab-page";
import { TIMEOUT } from "node:dns";

export class ApiContractPage extends BasePage {
  private readonly openApiTabPage: OpenAPISpecTabPage;
  readonly specTree: Locator;
  readonly testBtn: Locator;
  readonly serviceUrlInput: Locator;
  readonly runButton: Locator;
  readonly runningButton: Locator;
  readonly countsContainer: Locator;
  readonly totalSpan: Locator;
  readonly successCountSpan: Locator;
  readonly failedCountSpan: Locator;
  readonly errorCountSpan: Locator;
  readonly notcoveredCountSpan: Locator;
  readonly excludedCountSpan: Locator;
  readonly excludeButton: Locator;
  readonly pathHeader: Locator;
  readonly responseHeader: Locator;
  readonly uniqueContainer: Locator;

  // Aliases set in constructor
  readonly rowLocator: (
    path: string,
    method: string,
    response: string,
  ) => Locator;
  readonly remarkCellLocator: (row: Locator) => Locator;
  readonly pollDataRunning: () => Promise<string | null>;
  readonly exclusionCheckboxLocator: (
    path: string,
    method: string,
    response: string,
  ) => Locator;
  readonly headerCheckBox: Locator;

  readonly tableHeader: (key: string) => Locator;
  readonly tableRows: Locator;

  readonly summaryCount: (type: string) => Locator;
  readonly resultCell: Locator;

  readonly failedResultCountSpans: Locator;
  readonly activeDrillDown: Locator;
  readonly getExpandHeader: () => Locator;
  readonly getRawBtn: () => Locator;
  readonly getTableBtn: () => Locator;
  readonly getPreDetails: () => Locator;
  readonly resultsContainer: Locator;
  readonly drillDownScenarios: Locator;

  readonly mixedOperationErrorContainer: Locator;

  readonly prereqErrorAlert: Locator;
  readonly getPrereqErrorSummary: () => Locator;
  readonly getPrereqErrorMessage: () => Locator;

  readonly generativeCheckbox: Locator;

  readonly filterListItems: Locator;

  constructor(page: Page, testInfo?: TestInfo, eyes?: any) {
    super(page, testInfo, eyes);
    this.specTree = page.locator("#spec-tree");
    this.testBtn = page.getByText(/Execute contract tests/i);
    this.serviceUrlInput = page.getByPlaceholder("Service URL");
    this.runButton = page.locator(
      'button.run[data-type="test"][data-running="false"]',
    );
    this.runningButton = page.locator('button.run[data-type="test"]');
    this.countsContainer = page.locator(
      'div.test ol.counts[data-filter="total"]',
    );
    this.totalSpan = page.locator(
      'div.test ol.counts[data-filter="total"] > li.count[data-type="total"] > span',
    );
    this.successCountSpan = page.locator(
      'div.test ol.counts[data-filter="total"] > li.count[data-type="success"] > span',
    );
    this.failedCountSpan = page.locator(
      'div.test ol.counts[data-filter="total"] > li.count[data-type="failed"] > span',
    );
    this.errorCountSpan = page.locator(
      'div.test ol.counts[data-filter="total"] > li.count[data-type="error"] > span',
    );
    this.notcoveredCountSpan = page.locator(
      'div.test ol.counts[data-filter="total"] > li.count[data-type="notcovered"] > span',
    );
    this.excludedCountSpan = page.locator(
      'div.test ol.counts[data-filter="total"] > li.count[data-type="excluded"] > span',
    );
    this.pathHeader = page
      .locator("table")
      .filter({ visible: true })
      .locator('th[data-key="path"]')
      .first();
    this.responseHeader = page
      .locator("table")
      .filter({ visible: true })
      .locator('th[data-key="response"]')
      .first();
    this.uniqueContainer = page.locator("#unique-container");
    this.excludeButton = page.getByRole("button", { name: /exclude/i });
    this.rowLocator = (path: string, method: string, response: string) =>
      page.locator(
        `table#test > tbody > tr:has(td[data-key="path"][data-value="${path}"]):has(td[data-key="method"][data-value="${method}"]):has(td[data-key="response"][data-value="${response}"])`,
      );
    this.remarkCellLocator = (row: Locator) =>
      row.locator('td[data-key="remark"]');
    this.pollDataRunning = async () => {
      const result = await page.evaluate(() => {
        const els = Array.from(
          document.querySelectorAll("[data-running][data-type='test']"),
        );
        return els.some((el) => el.getAttribute("data-running") === "true")
          ? "true"
          : els.length > 0
            ? "false"
            : null;
      });
      return result;
    };
    this.exclusionCheckboxLocator = (
      path: string,
      method: string,
      response: string,
    ) =>
      page.locator(
        `table#test > tbody > tr:has(td[data-key="path"][data-value="${path}"]):has(td[data-key="method"][data-value="${method}"]):has(td[data-key="response"][data-value="${response}"]) input[type='checkbox']`,
      );

    this.headerCheckBox = page.locator(
      'table#test thead input[type="checkbox"]',
    );
    this.openApiTabPage = new OpenAPISpecTabPage(this);

    //Table Locators
    this.tableHeader = (key: string) =>
      page.locator(`table#test thead th[data-key="${key}"]`);
    this.tableRows = page.locator("table#test tbody tr");

    //Header Locators
    this.summaryCount = (type: string) =>
      page.locator(
        `ol.counts:visible li[data-type="${type}"] span[data-value]`,
      );

    this.resultCell = page.locator('td[data-key="result"]');

    this.failedResultCountSpans = page.locator(
      'td[data-key="result"] span[data-key="failed"]',
    );

    this.activeDrillDown = page.locator("drill-down:visible").first();

    this.getExpandHeader = () => this.activeDrillDown.locator("div.header");
    this.getRawBtn = () =>
      this.activeDrillDown.locator("button.dd-viewBtn--details");
    this.getTableBtn = () =>
      this.activeDrillDown.locator("button.dd-viewBtn--errors");
    this.getPreDetails = () => this.activeDrillDown.locator("pre.detailsPre");
    this.resultsContainer = page
      .locator("div.body")
      .filter({ visible: true })
      .first();
    this.drillDownScenarios = this.resultsContainer.locator("drill-down");

    this.mixedOperationErrorContainer = page.locator(
      'div.error[data-active="true"]',
    );

    this.prereqErrorAlert = page.locator("#prereq-error-alert").first();
    this.getPrereqErrorSummary = () =>
      this.prereqErrorAlert.locator("#prereq-error-summary");
    this.getPrereqErrorMessage = () =>
      this.prereqErrorAlert.locator("#prereq-error-message");

    this.generativeCheckbox = page.locator("input#generative");

    this.filterListItems = page.locator("ol.counts > li.count");
  }

  //Function Beginning
  async openExecuteContractTestsTab() {
    return this.openApiTabPage.openExecuteContractTestsTab();
  }

  async enterServiceUrl(serviceUrl: string) {
    await test.step(`Enter service URL: '${serviceUrl}'`, async () => {
      await expect(this.serviceUrlInput).toBeVisible({ timeout: 4000 });
      await this.serviceUrlInput.fill(serviceUrl);
      await takeAndAttachScreenshot(this.page, "service-url-entered");
    });
  }

  async setGenerativeMode(enable: boolean) {
    const isChecked = await this.generativeCheckbox.isChecked();
    if (isChecked !== enable) {
      enable
        ? await this.generativeCheckbox.check()
        : await this.generativeCheckbox.uncheck();
    }
    await takeAndAttachScreenshot(this.page, `generative-mode-${enable}`);
  }

  async clickRunContractTests() {
    await test.step("Run Contract Tests", async () => {
      try {
        await expect(this.runButton).toBeVisible({ timeout: 10000 });
        await expect(this.runButton).toBeEnabled({ timeout: 10000 });
      } catch (e) {
        await takeAndAttachScreenshot(this.page, "error-run-btn-not-visible");
        throw new Error(`Run button not visible/enabled: ${e}`);
      }
      const runBtnSelector =
        'button.run[data-type="test"][data-running="false"]';
      try {
        await this.page.waitForFunction(
          (selector) => {
            const el = document.querySelector(selector);
            if (!el) return false;
            const rect = el.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            const elementAtPoint = document.elementFromPoint(x, y);
            return elementAtPoint === el || el.contains(elementAtPoint);
          },
          runBtnSelector,
          { timeout: 10000 },
        );
      } catch (e) {
        await takeAndAttachScreenshot(
          this.page,
          "error-run-btn-not-interactable",
        );
        throw new Error(`Run button not interactable: ${e}`);
      }
      await this.runButton.click();
      await takeAndAttachScreenshot(
        this.page,
        "clicked-run-contract-tests",
        this.eyes,
      );
      await this.waitForTestCompletion();
    });
  }

  async waitForTestCompletion() {
    await this.waitForTestsToStartRunning();

    await this.waitForTestsToCompleteExecution();

    await takeAndAttachScreenshot(this.page, "test-completed", this.eyes);
  }

  private async waitForTestsToCompleteExecution() {
    let lastValue = null;
    try {
      await expect
        .poll(
          async () => {
            const value = await this.pollDataRunning();
            lastValue = value;
            console.log(
              `[waitForTestsToCompleteExecution] data-running: ${value}`,
            );
            return value;
          },
          {
            timeout: 300000,
            intervals: [2000],
            message: "Waiting for contract tests to complete",
          },
        )
        .toBe("false");
    } catch (e) {
      throw new Error(
        `Contract tests did not complete. Last data-running value: ${lastValue}. Error: ${e}`,
      );
    }
  }

  private async waitForTestsToStartRunning() {
    try {
      await expect
        .poll(this.pollDataRunning, {
          timeout: 20000,
          message: "Waiting for contract tests to start",
        })
        .toBe("true");
    } catch (e) {
      await takeAndAttachScreenshot(
        this.page,
        "error-contract-tests-not-started",
      );
    }
  }

  async verifyTestResults() {
    const isAnyNumber = /^\d+$/;
    try {
      await this.totalSpan.waitFor({ state: "visible", timeout: 10000 });
    } catch (e) {
      await takeAndAttachScreenshot(
        this.page,
        "error-verify-total-span-not-visible",
      );
      throw new Error("#verify-total-span not visible after waiting");
    }
    try {
      await expect(this.totalSpan).toHaveText(isAnyNumber, {
        timeout: 10000,
      });
    } catch (e) {
      await takeAndAttachScreenshot(
        this.page,
        "error-verify-total-span-no-text",
      );
      throw new Error(`#verify-total-span did not match expected text: ${e}`);
    }
    const value = await this.totalSpan.innerText();
    await takeAndAttachScreenshot(this.page, "test-results-number-verified");
  }

  async verifyRowRemark(
    path: string,
    method: string,
    response: string,
    expectedRemark?: string | RegExp,
  ) {
    const row = this.rowLocator(path, method, response);
    const count = await this.page.locator("tbody tr").count();
    if (count === 0) {
      throw new Error(
        `No rows found in table for path: ${path}, method: ${method}, response: ${response}`,
      );
    }
    await expect(row).toBeVisible({ timeout: 10000 });
    const remarkCell = this.remarkCellLocator(row);
    if (expectedRemark) {
      await expect(remarkCell).toHaveText(expectedRemark, { timeout: 10000 });
    } else {
      await expect(remarkCell).not.toBeEmpty({ timeout: 10000 });
    }
  }

  async selectTestForExclusionOrInclusion(
    path: string,
    method: string,
    response: string,
  ) {
    const checkbox = this.exclusionCheckboxLocator(path, method, response);
    try {
      await expect(checkbox).toBeVisible({ timeout: 15000 });
    } catch (e) {
      await takeAndAttachScreenshot(
        this.page,
        `error-checkbox-not-visible-${path}-${method}-${response}`,
      );
      // Log the table DOM for debugging
      const tableHtml = await this.page
        .locator("table")
        .first()
        .innerHTML()
        .catch(() => "<no table>");
      console.error(`Table HTML for exclusion: ${tableHtml}`);
      throw new Error(
        `Exclusion checkbox not visible for ${path} ${method} ${response}: ${e}`,
      );
    }
    const isChecked = await checkbox.isChecked();
    if (!isChecked) {
      await checkbox.click();
    }
    await takeAndAttachScreenshot(
      this.page,
      "excluded-test-" + `${path}-${method}-${response}`,
      this.eyes,
    );
  }

  async clickExcludeButton() {
    await expect(this.excludeButton).toBeVisible({ timeout: 10000 });
    await this.excludeButton.click();
    await takeAndAttachScreenshot(
      this.page,
      "exclude-button-clicked",
      this.eyes,
    );
  }

  async clickIncludeButton() {
    await expect(this.page.locator("button.clear")).toBeVisible({
      timeout: 10000,
    });
    await this.page.locator("button.clear").click();
    await takeAndAttachScreenshot(
      this.page,
      "include-button-clicked",
      this.eyes,
    );
  }

  async selectAllTestsForExclusion() {
    await this.headerCheckBox.check();
    await takeAndAttachScreenshot(this.page, "all-tests-checked", this.eyes);
  }

  async selectMultipleTests(
    testList: { path: string; method: string; response: string }[],
  ) {
    for (const testItem of testList) {
      await this.selectTestForExclusionOrInclusion(
        testItem.path,
        testItem.method,
        testItem.response,
      );
    }
  }

  async getMixedOperationErrorText(): Promise<string> {
    await this.mixedOperationErrorContainer.waitFor({
      state: "visible",
      timeout: 5000,
    });
    const errorText = await this.mixedOperationErrorContainer.innerText();

    await takeAndAttachScreenshot(
      this.page,
      "mixed-operation-error-captured",
      this.eyes,
    );

    return errorText;
  }

  // async verifyTestExclusion() {
  //   const excludedCount = this.countsContainer.locator(
  //     'li[data-type="excluded"] span',
  //   );
  //   await expect(excludedCount).toBeVisible({ timeout: 10000 });
  //   await takeAndAttachScreenshot(
  //     this.page,
  //     "test-exclusion-verified",
  //     this.eyes,
  //   );
  // }

  /**
   * Retrieves the 'data-total' attribute value for a specific header key
   * @param key 'path' | 'method' | 'response'
   */
  async getTableHeaderCount(key: string): Promise<number> {
    await takeAndAttachScreenshot(this.page, `header-count-${key}`, this.eyes);

    const enabledCount =
      await this.tableHeader(key).getAttribute("data-enabled");

    return parseInt(enabledCount || "0", 10);
  }

  /**
   * Scrapes the table and returns the count of unique values in a specific column
   * @param columnIndex 0-based index (e.g., Path might be 2, Method might be 3)
   */
  async getUniqueValuesInColumn(columnIndex: number): Promise<number> {
    const rows = this.tableRows;
    const count = await rows.count();
    const uniqueValues = new Set();

    for (let i = 0; i < count; i++) {
      const cellText = await rows
        .nth(i)
        .locator("td")
        .nth(columnIndex)
        .innerText();
      uniqueValues.add(cellText.trim());
    }

    return uniqueValues.size;
  }

  async getAllHeaderTotals() {
    return {
      path: await this.getTableHeaderCount("path"),
      method: await this.getTableHeaderCount("method"),
      response: await this.getTableHeaderCount("response"),
    };
  }

  async getActualRowCount(): Promise<number> {
    return await this.tableRows.count();
  }

  async getSummaryHeaderValue(
    type: "success" | "failed" | "error" | "notcovered" | "excluded" | "total",
  ): Promise<number> {
    const value = await this.summaryCount(type)
      .first()
      .getAttribute("data-value");
    return parseInt(value || "0", 10);
  }

  async getAggregateTableResults() {
    await takeAndAttachScreenshot(
      this.page,
      "calculating table results",
      this.eyes,
    );

    // Get all result cells in the visible table
    const resultCells = await this.page
      .locator('table#test:visible td[data-key="result"]')
      .all();

    const totals = {
      success: 0,
      failed: 0,
      error: 0,
      notcovered: 0,
      excluded: 0,
      total: 0,
    };

    for (const cell of resultCells) {
      // Fetch all data-values for this row in parallel
      const [s, f, e, n, ex, t] = await Promise.all([
        cell.locator('span[data-key="success"]').getAttribute("data-value"),
        cell.locator('span[data-key="failed"]').getAttribute("data-value"),
        cell.locator('span[data-key="error"]').getAttribute("data-value"),
        cell.locator('span[data-key="notcovered"]').getAttribute("data-value"),
        cell.locator('span[data-key="excluded"]').getAttribute("data-value"),
        cell.locator('span[data-key="total"]').getAttribute("data-value"),
      ]);

      totals.success += parseInt(s || "0", 10);
      totals.failed += parseInt(f || "0", 10);
      totals.error += parseInt(e || "0", 10);
      totals.notcovered += parseInt(n || "0", 10);
      totals.excluded += parseInt(ex || "0", 10);
      totals.total += parseInt(t || "0", 10);
    }

    return totals;
  }

  async getSummaryHeaderTotals() {
    await takeAndAttachScreenshot(
      this.page,
      "calculating table results",
      this.eyes,
    );

    const keys = [
      "success",
      "failed",
      "error",
      "notcovered",
      "excluded",
      "total",
    ] as const;

    const values = await Promise.all(
      keys.map((key) => this.getSummaryHeaderValue(key)),
    );

    return {
      success: values[0],
      failed: values[1],
      error: values[2],
      notcovered: values[3],
      excluded: values[4],
      total: values[5],
    };
  }

  async getFailedResultsCount(index: number): Promise<number> {
    const span = this.failedResultCountSpans.nth(index);
    const value = await span.getAttribute("data-value");
    return parseInt(value || "0", 10);
  }

  async clickFailedResults(index: number): Promise<void> {
    const span = this.failedResultCountSpans.nth(index);
    await span.click();
    await takeAndAttachScreenshot(
      this.page,
      "Clicked Failed Scenarios",
      this.eyes,
    );
  }

  async verifyFailedScenariosCount(expectedCount: number) {
    await expect(this.resultsContainer).toBeVisible({ timeout: 10000 });

    await takeAndAttachScreenshot(
      this.page,
      `Expected Failed Scenario Count ${expectedCount}`,
      this.eyes,
    );
  }

  async toggleScenarioViews(scenarioIndex: number = 0) {
    const scenario = this.drillDownScenarios.nth(scenarioIndex);
    const header = scenario.locator(".header");

    if ((await header.getAttribute("aria-expanded")) === "false") {
      await header.click();
    }

    const rawBtn = scenario.locator("button.dd-viewBtn--details");
    const tableBtn = scenario.locator("button.dd-viewBtn--errors");
    const preDetails = scenario.locator("pre.detailsPre");

    await rawBtn.click();
    await expect(preDetails).toBeVisible();
    await expect(rawBtn).toHaveAttribute("aria-pressed", "true");

    await takeAndAttachScreenshot(
      this.page,
      `toggled-scenario-${scenarioIndex}`,
      this.eyes,
    );

    await tableBtn.click();
    await expect(preDetails).toBeHidden();
    await expect(scenario.locator("table.rulesTable")).toBeVisible();

    await takeAndAttachScreenshot(
      this.page,
      `toggled-scenario-${scenarioIndex}`,
      this.eyes,
    );
  }

  async verifyPrereqErrorVisible(expectedSummary: string | RegExp) {
    const summary = this.getPrereqErrorSummary();

    await expect(summary).toBeAttached({ timeout: 15000 });
    await expect(summary).toContainText(expectedSummary);

    await takeAndAttachScreenshot(
      this.page,
      "prereq-error-verified",
      this.eyes,
    );
  }

  /**
   * POM Action: Applies a filter by its name (success, failed, total, etc.)
   * Returns the expected values to the test for verification.
   */
  async applyHeaderFilterByType(filterType: string) {
    const filter = this.page
      .locator(`ol.counts > li.count[data-type="${filterType}"]`)
      .first();

    const classAttr = (await filter.getAttribute("class")) || "";
    if (classAttr.includes("disabled")) {
      throw new Error(
        `Filter "${filterType}" is currently disabled and cannot be clicked.`,
      );
    }

    const expectedValue = parseInt(
      (await filter.locator("span").getAttribute("data-value")) || "0",
      10,
    );

    const expectedResultAttr =
      filterType === "notcovered"
        ? "NotCovered"
        : filterType.charAt(0).toUpperCase() + filterType.slice(1);

    await filter.dispatchEvent("click");

    await takeAndAttachScreenshot(this.page, `Filter Clicked for ${filter}`);

    return { expectedValue, expectedResultAttr };
  }
}
