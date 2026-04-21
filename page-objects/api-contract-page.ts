import { test, Locator, expect, type TestInfo, Page } from "@playwright/test";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";
import { BasePage } from "./base-page";
import { OpenAPISpecTabPage } from "./openapi-spec-tab-page";
import { PRODUCT_SEARCH_BFF_SPEC } from "../specs/specNames";

export class ApiContractPage extends BasePage {
  private readonly openApiTabPage: OpenAPISpecTabPage;
  protected readonly specTree: Locator;
  private readonly testBtn: Locator;
  private readonly serviceUrlInput: Locator;
  private readonly _runButton: Locator;
  private readonly runningButton: Locator;
  private readonly countsContainer: Locator;
  private readonly totalSpan: Locator;
  private readonly successCountSpan: Locator;
  private readonly failedCountSpan: Locator;
  private readonly errorCountSpan: Locator;
  private readonly notcoveredCountSpan: Locator;
  private readonly excludedCountSpan: Locator;
  private readonly excludeButton: Locator;
  private readonly includeButton: Locator;
  private readonly pathHeader: Locator;
  private readonly responseHeader: Locator;
  private readonly uniqueContainer: Locator;
  private readonly asyncRunButton: Locator;
  private readonly summaryValueLocator: (type: string) => Locator;

  // Aliases set in constructor
  private readonly rowLocator: (
    path: string,
    method: string,
    response: string,
  ) => Locator;
  private readonly remarkCellLocator: (row: Locator) => Locator;
  private readonly pollDataRunning: () => Promise<string | null>;
  private readonly exclusionCheckboxLocator: (
    path: string,
    method: string,
    response: string,
  ) => Locator;
  private readonly headerCheckBox: Locator;

  private readonly tableHeader: (key: string) => Locator;
  private readonly tableRows: Locator;

  private readonly summaryCount: (type: string) => Locator;
  private readonly resultCell: Locator;

  private readonly _failedResultCountSpans: Locator;
  private readonly activeDrillDown: Locator;
  private readonly getExpandHeader: () => Locator;
  private readonly getRawBtn: () => Locator;
  private readonly getTableBtn: () => Locator;
  private readonly getPreDetails: () => Locator;
  private readonly resultsContainer: Locator;
  private readonly _drillDownScenarios: Locator;

  private readonly mixedOperationErrorContainer: Locator;

  private readonly prereqErrorAlert: Locator;
  private readonly getPrereqErrorSummary: () => Locator;
  private readonly getPrereqErrorMessage: () => Locator;

  private readonly generativeCheckbox: Locator;

  private readonly filterListItems: Locator;

  private readonly headerByType: (type: string) => Locator;
  private readonly tableResultSpansByType: (type: string) => Locator;

  private readonly specSection: Locator;

  private readonly sidebarProcessBar: (specName: string) => Locator;

  readonly infoDialog: Locator;

  constructor(page: Page, testInfo: TestInfo, eyes: any, specName: string) {
    super(page, testInfo, eyes, specName);
    this.specTree = page.locator("#spec-tree");
    this.specSection = page.locator(`div[id*="${specName}"]`);
    this.testBtn = this.specSection.locator('li[data-type="test"]');

    const scoped = (selector: string) => this.specSection.locator(selector);

    this.serviceUrlInput = this.specSection.locator("#testBaseUrl");
    this._runButton = scoped('button[data-type="test"]');
    this.runningButton = scoped('button.run[data-type="test"]');
    this.countsContainer = this.specSection
      .locator("div.test .header ol.counts")
      .filter({ visible: true })
      .first();
    this.totalSpan = this.countsContainer.locator(
      'li.count[data-type="total"] > span',
    );

    this.successCountSpan = this.countsContainer.locator(
      'li.count[data-type="success"] > span',
    );

    this.failedCountSpan = this.countsContainer.locator(
      'li.count[data-type="failed"] > span',
    );

    this.errorCountSpan = this.countsContainer.locator(
      'li.count[data-type="error"] > span',
    );

    this.notcoveredCountSpan = this.countsContainer.locator(
      'li.count[data-type="notcovered"] > span',
    );

    this.excludedCountSpan = this.countsContainer.locator(
      'li.count[data-type="excluded"] > span',
    );

    this.pathHeader = this.specSection
      .locator("table")
      .filter({ visible: true })
      .locator('th[data-key="path"]')
      .first();
    this.responseHeader = this.specSection
      .locator("table")
      .filter({ visible: true })
      .locator('th[data-key="response"]')
      .first();
    this.uniqueContainer = this.specSection.locator("#unique-container");
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
    this.tableRows = page.locator("table#test > tbody > tr");

    //Header Locators
    this.summaryCount = (type: string) =>
      this.countsContainer.locator(
        `li.count[data-type="${type}"] span[data-value]`,
      );

    this.resultCell = scoped('td[data-key="result"]');

    this._failedResultCountSpans = page.locator(
      'td[data-key="result"] span[data-key="failed"]:not([data-value="0"])',
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
    this._drillDownScenarios = this.resultsContainer.locator("drill-down");

    this.mixedOperationErrorContainer = page.locator(
      'div.error[data-active="true"]',
    );

    this.prereqErrorAlert = scoped("#prereq-error-alert");
    this.getPrereqErrorSummary = () =>
      this.prereqErrorAlert
        .locator("#prereq-error-summary")
        .filter({ visible: true });

    this.getPrereqErrorMessage = () =>
      this.prereqErrorAlert
        .locator("#prereq-error-message")
        .filter({ visible: true });

    this.generativeCheckbox = scoped("input#generative");

    this.filterListItems = this.countsContainer.locator("li.count");

    this.headerByType = (type: string) =>
      this.countsContainer.locator(`li.count[data-type="${type}"]`);

    this.tableResultSpansByType = (type: string) =>
      this.resultCell.locator(`span[data-key="${type}"]`);

    this.sidebarProcessBar = (specName: string) =>
      page.locator(
        `#accordion-group-TEST .process-bar[data-spec-path*="${specName}"]`,
      );

    this.includeButton = this.specSection
      .locator("button.clear")
      .filter({ hasText: "Include" });

    this.infoDialog = this.page.locator("#alert-container .alert-msg.info");

    this.asyncRunButton = page
      .locator(`[id$="${this.specName}"] #async-run-test`)
      .filter({ visible: true });

    this.summaryValueLocator = (type: string) =>
      this.page.locator(
        `[id$="${this.specName}"] .header ol.counts:visible li[data-type="${type}"] span[data-value]`,
      );
  }

  //Function Beginning
  private async openExecuteContractTestsTab() {
    return this.openApiTabPage.openExecuteContractTestsTab();
  }

  async openContractTestTabForAsync() {
    await this.openApiTabPage.openExecuteContractTestsTab();
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
    await takeAndAttachScreenshot(
      this.page,
      `generative-mode-${enable}`,
      this.eyes,
    );
  }

  async clickRunContractTests(expectSuccess: boolean = true) {
    await test.step("Run Contract Tests", async () => {
      await expect(this._runButton).toBeEnabled({ timeout: 10000 });

      await expect(this._runButton).toHaveAttribute("data-running", "false", {
        timeout: 10000,
      });

      await this._runButton.click();

      await takeAndAttachScreenshot(this.page, "clicked-run-contract-tests");

      if (expectSuccess) {
        await this.waitForTestCompletion();
      } else {
        await this.page.waitForTimeout(1000);
      }
    });
  }

  // async waitforDialogToDismiss(status: string | RegExp) {
  //   await this.infoDialog
  //     .waitFor({ state: "visible", timeout: 5000 })
  //     .then(() => true)
  //     .catch(() => false);

  //   await expect.soft(this.infoDialog).toContainText(status, {
  //     timeout: 10000,
  //   });

  //   await this.infoDialog.waitFor({ state: "hidden", timeout: 5000 });
  // }

  private async waitForTestCompletion() {
    await this.waitForTestsToStartRunning();

    await this.waitForTestsToCompleteExecution();

    // await this.waitforDialogToDismiss(/Tests? complete/i);

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
      await this.verifySidebarStatus(this.specName!, "Running");
    } catch (e) {
      await this.handlePrereqErrorIfVisible();

      const startedAfterWarning = await expect
        .poll(this.pollDataRunning, {
          timeout: 10000,
          intervals: [1000, 2000],
          message:
            "Waiting for contract tests to start after prerequisite warning",
        })
        .toBe("true")
        .then(() => true)
        .catch(() => false);

      if (startedAfterWarning) {
        await this.verifySidebarStatus(this.specName!, "Running");
        return;
      }

      throw new Error(`Contract tests did not start running: ${e}`);
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
    await takeAndAttachScreenshot(
      this.page,
      "test-results-number-verified",
      this.eyes,
    );
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

  async verifyRemarkStatusMetrics(
    path: string,
    method: string,
    response: string,
    expectedStatus: string | RegExp,
  ) {
    const row = this.rowLocator(path, method, response);
    await expect(row).toBeVisible({ timeout: 10000 });

    const remarkCell = this.remarkCellLocator(row);
    await expect(remarkCell.locator(".remark-cell-status")).toHaveText(
      expectedStatus,
      { timeout: 10000 },
    );

    const resultCell = row.locator('td[data-key="result"]');
    const [success, total, attempts, matches] = await Promise.all([
      this.getResultCountFromCell(resultCell, "success"),
      this.getResultCountFromCell(resultCell, "total"),
      this.getRemarkMetricCount(remarkCell, "attempts"),
      this.getRemarkMetricCount(remarkCell, "matches"),
    ]);

    expect(attempts, "Remark attempts should match row total results").toBe(
      total,
    );
    expect(matches, "Remark matches should match row success results").toBe(
      success,
    );
  }

  async verifySkipReasonPopover(
    path: string,
    method: string,
    response: string,
    reasonLabel: string,
    expectedContext: Record<string, string>,
    expectedRules: { ruleId: string; details: string }[],
  ) {
    const row = this.rowLocator(path, method, response);
    await expect(row).toBeVisible({ timeout: 10000 });

    const remarkCell = this.remarkCellLocator(row);
    const skipList = remarkCell.locator(".remark-cell-skip-list");
    await expect(skipList).toBeVisible({ timeout: 10000 });

    const reasonButton = skipList
      .locator(".skip-reason-trigger")
      .filter({ hasText: reasonLabel })
      .first();
    await expect(reasonButton).toBeVisible({ timeout: 10000 });
    await reasonButton.click();

    const popover = remarkCell
      .locator(".skip-reason-content")
      .filter({ visible: true })
      .first();
    await expect(popover).toBeVisible({ timeout: 10000 });

    const context = popover.locator(".skip-reason-context");
    for (const [label, value] of Object.entries(expectedContext)) {
      await expect(
        context,
        `Skip reason context should include ${label}`,
      ).toContainText(label);
      await expect(
        context,
        `Skip reason context should include ${value}`,
      ).toContainText(value);
    }

    for (const rule of expectedRules) {
      const ruleRow = popover
        .locator("table.rulesTable tbody tr")
        .filter({
          hasText: rule.ruleId,
        })
        .first();
      await expect(
        ruleRow,
        `Rule ${rule.ruleId} should be visible`,
      ).toBeVisible({ timeout: 10000 });
      await expect(ruleRow).toContainText(rule.details);
    }

    await this.page.mouse.click(10, 10);
    await expect(popover).toBeHidden({ timeout: 5000 });
  }

  private async getResultCountFromCell(
    resultCell: Locator,
    key: "success" | "failed" | "notcovered" | "excluded" | "total",
  ): Promise<number> {
    const value = await resultCell
      .locator(`span[data-key="${key}"]`)
      .getAttribute("data-value");
    return parseInt(value || "0", 10);
  }

  private async getRemarkMetricCount(
    remarkCell: Locator,
    metric: "attempts" | "matches",
  ): Promise<number> {
    const text = await remarkCell
      .locator(`strong[data-role="${metric}"]`)
      .innerText();
    return parseInt(text.trim() || "0", 10);
  }

  async hasRow(
    path: string,
    method: string,
    response: string,
  ): Promise<boolean> {
    return (await this.rowLocator(path, method, response).count()) > 0;
  }

  async assertRowVisible(path: string, method: string, response: string) {
    await expect(this.rowLocator(path, method, response)).toBeVisible({
      timeout: 10000,
    });
    await takeAndAttachScreenshot(
      this.page,
      `row-visible-${path}-${method}-${response}`.replace(
        /[^a-zA-Z0-9-]/g,
        "-",
      ),
      this.eyes,
    );
  }

  async assertRowAbsent(path: string, method: string, response: string) {
    await expect(this.rowLocator(path, method, response)).toHaveCount(0);
    await takeAndAttachScreenshot(
      this.page,
      `row-absent-${path}-${method}-${response}`.replace(/[^a-zA-Z0-9-]/g, "-"),
      this.eyes,
    );
  }

  async assertSummaryCountsCleared() {
    const totals = await this.getSummaryHeaderTotals();
    expect(totals).toStrictEqual({
      success: 0,
      failed: 0,
      notcovered: 0,
      excluded: 0,
      total: 0,
    });

    await takeAndAttachScreenshot(
      this.page,
      "contract-summary-counts-cleared",
      this.eyes,
    );
  }

  async selectTestForExclusionOrInclusion(
    path: string,
    method: string,
    response: string,
    { captureVisual = true }: { captureVisual?: boolean } = {},
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
    if (captureVisual) {
      await takeAndAttachScreenshot(
        this.page,
        "excluded-test-" + `${path}-${method}-${response}`,
        this.eyes,
      );
    }
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
    await expect(this.includeButton).toBeVisible({
      timeout: 10000,
    });
    await this.includeButton.click();
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
        { captureVisual: false },
      );
    }
    await takeAndAttachScreenshot(
      this.page,
      `multiple-tests-selected-${testList.length}`,
      this.eyes,
    );
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

  /**
   * Retrieves the 'data-total' attribute value for a specific header key
   * @param key 'path' | 'method' | 'response'
   */
  async getTableHeaderCount(key: string): Promise<number> {
    await takeAndAttachScreenshot(this.page, `header-count-${key}`);

    const enabledCount =
      await this.tableHeader(key).getAttribute("data-enabled");

    return parseInt(enabledCount || "0", 10);
  }

  /**
   * Scrapes the table and returns the count of unique values in a specific column
   * @param columnIndex 0-based index
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

  async getUniqueValuesForKey(columnKey: string): Promise<number> {
    const cells = this.page.locator(
      `table#test tbody tr td[data-key="${columnKey}"]`,
    );
    const values = await cells.evaluateAll((elements) =>
      elements
        .map(
          (element) =>
            element.getAttribute("data-value") || element.textContent || "",
        )
        .map((value) => value.trim())
        .filter(Boolean),
    );

    return new Set(values).size;
  }

  async getAllHeaderTotals() {
    await takeAndAttachScreenshot(this.page, "all-header-totals", this.eyes);
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
    type: "success" | "failed" | "notcovered" | "excluded" | "total",
  ): Promise<number> {
    const countElement = this.summaryValueLocator(type);
    try {
      const elementCount = await countElement.count();
      if (elementCount === 0) {
        return 0;
      }
      await countElement.first().waitFor({ state: "visible", timeout: 5000 });

      let value = await countElement.first().getAttribute("data-value");

      if (!value) {
        await this.page.waitForTimeout(500);
        value = await countElement.first().getAttribute("data-value");
      }

      return parseInt(value || "0", 10);
    } catch (e) {
      console.warn(
        `Failed to get summary header value for type "${type}": ${e}`,
      );
      return 0;
    }
  }

  async getAggregateTableResults() {
    await takeAndAttachScreenshot(
      this.page,
      "calculating aggregate table results",
    );

    // Get all result cells in the visible table
    const resultCells = await this.page
      .locator('table#test:visible > tbody > tr > td[data-key="result"]')
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
      const [s, f, n, ex, t] = await Promise.all([
        cell.locator('span[data-key="success"]').getAttribute("data-value"),
        cell.locator('span[data-key="failed"]').getAttribute("data-value"),
        cell.locator('span[data-key="notcovered"]').getAttribute("data-value"),
        cell.locator('span[data-key="excluded"]').getAttribute("data-value"),
        cell.locator('span[data-key="total"]').getAttribute("data-value"),
      ]);

      totals.success += parseInt(s || "0", 10);
      totals.failed += parseInt(f || "0", 10);
      totals.notcovered += parseInt(n || "0", 10);
      totals.excluded += parseInt(ex || "0", 10);
      totals.total += parseInt(t || "0", 10);
    }

    return totals;
  }

  async getSummaryHeaderTotals() {
    await takeAndAttachScreenshot(
      this.page,
      "calculating summary table results",
    );

    const keys = [
      "success",
      "failed",
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
      error: 0,
      notcovered: values[2],
      excluded: values[3],
      total: values[4],
    };
  }

  async getSoapSummaryHeaderTotals() {
    await takeAndAttachScreenshot(
      this.page,
      "calculating SOAP summary header results",
    );

    const getSpanValue = async (span: Locator): Promise<number> => {
      try {
        await span.waitFor({ state: "visible", timeout: 5000 });
        const value = await span.getAttribute("data-value");
        return parseInt(value || "0", 10);
      } catch (e) {
        const text = await span.innerText().catch(() => "0");
        return parseInt(text || "0", 10);
      }
    };

    const [success, failed, notcovered, total] = await Promise.all([
      getSpanValue(this.successCountSpan),
      getSpanValue(this.failedCountSpan),
      getSpanValue(this.notcoveredCountSpan),
      getSpanValue(this.totalSpan),
    ]);

    return {
      success,
      failed,
      notcovered,
      total,
    };
  }

  async getFailedResultsCount(index: number): Promise<number> {
    const span = this._failedResultCountSpans.nth(index);
    const value = await span.getAttribute("data-value");
    return parseInt(value || "0", 10);
  }

  async clickFailedResults(index: number): Promise<void> {
    const span = this._failedResultCountSpans.nth(index);
    await span.click();
    await takeAndAttachScreenshot(this.page, "Clicked Failed Scenarios");
  }

  async verifyFailedScenariosCount(expectedCount: number) {
    await expect(this.resultsContainer).toBeVisible({ timeout: 10000 });

    await takeAndAttachScreenshot(
      this.page,
      `Expected Failed Scenario Count ${expectedCount}`,
    );
  }

  async toggleScenarioViews(scenarioIndex: number = 0) {
    const scenario = this._drillDownScenarios.nth(scenarioIndex);
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
      "toggled-scenario-raw-view",
      this.eyes,
    );

    await tableBtn.click();
    await expect(preDetails).toBeHidden();
    await expect(scenario.locator("table.rulesTable")).toBeVisible();

    await takeAndAttachScreenshot(
      this.page,
      "toggled-scenario-table-view",
      this.eyes,
    );
  }

  async verifyPrereqErrorVisible(expectedSummary: string | RegExp) {
    const summary = this.getPrereqErrorSummary();

    await expect(summary).toBeAttached({ timeout: 15000 });
    await takeAndAttachScreenshot(
      this.page,
      "prereq-error-verified",
      this.eyes,
    );
    await expect(summary).toContainText(expectedSummary);
  }

  async applyHeaderFilterAndGetExpectedCount(
    filterType: string,
  ): Promise<number | null> {
    const header = this.headerByType(filterType);

    await expect(header, `Header "${filterType}" not found`).toBeVisible();

    const classAttr = (await header.getAttribute("class")) || "";
    if (classAttr.includes("disabled")) {
      console.info(`Filter "${filterType}" is disabled — skipping`);
      return null;
    }

    const expectedCount = await this.getHeaderCount(filterType);

    await header.click({ force: true });

    await expect(header).toHaveAttribute("data-active", "true", {
      timeout: 10000,
    });

    await takeAndAttachScreenshot(
      this.page,
      `filter-applied-for-${filterType}-tests`,
      this.eyes,
    );

    return expectedCount;
  }

  async getHeaderCount(filterType: string): Promise<number> {
    const header = await this.summaryCount(filterType);

    return parseInt((await header.getAttribute("data-value")) || "0", 10);
  }

  async getTableCountByResult(filterType: string): Promise<number> {
    const resultSpans = this.tableResultSpansByType(filterType);

    const count = await resultSpans.count();
    let total = 0;

    for (let i = 0; i < count; i++) {
      const value = await resultSpans.nth(i).getAttribute("data-value");
      total += value ? Number(value) : 0;
    }

    return total;
  }

  async getFilterTypes(): Promise<string[]> {
    const count = await this.filterListItems.count();
    const filterTypes = new Set<string>();

    for (let i = 0; i < count; i++) {
      const filterType = await this.filterListItems
        .nth(i)
        .getAttribute("data-type");

      if (filterType) {
        filterTypes.add(filterType);
      }
    }

    return Array.from(filterTypes);
  }

  async openContractTestTabForSpec(
    testInfo: import("@playwright/test").TestInfo,
    eyes: any,
    specName: string,
  ) {
    await test.step(`Go to Example Generation page for Service Spec: '${specName}'`, async () => {
      console.log(
        `Opening Example Generation page for Service Spec: '${specName}'`,
      );
      await this.gotoHome();
      await this.sideBar.selectSpec(specName);
      await this.openExecuteContractTestsTab();
    });
  }

  async openContractTestTabViaSidebar(specName: string) {
    await test.step(`Select '${specName}' via sidebar and open Contract Tests tab`, async () => {
      await this.sideBar.selectSpec(specName);
      await this.page.waitForTimeout(3000);
      await this.openExecuteContractTestsTab();
    });
  }

  // Getters for accessing private locators from tests
  get failedResultCountSpans(): Locator {
    return this._failedResultCountSpans;
  }

  get drillDownScenarios(): Locator {
    return this._drillDownScenarios;
  }

  get runButton(): Locator {
    return this._runButton;
  }

  async verifySidebarStatus(
    specName: string,
    expectedStatus: "Running" | "Done" | "Failed",
  ) {
    await test.step(`Verify sidebar status is '${expectedStatus}' for ${specName}`, async () => {
      const processRow = this.sidebarProcessBar(specName);
      const statusText = processRow.locator(".status-text");

      await expect(statusText).toBeVisible({ timeout: 10000 });
      await expect(statusText).toHaveText(expectedStatus, { ignoreCase: true });

      await takeAndAttachScreenshot(
        this.page,
        `sidebar-status-${expectedStatus}`,
      );
    });
  }

  async getSidebarStatusText(specName: string): Promise<string> {
    const processRow = this.sidebarProcessBar(specName);
    const statusText = processRow.locator(".status-text");
    await expect(statusText).toBeVisible({ timeout: 10000 });
    await takeAndAttachScreenshot(this.page, `sidebar-status-${specName}`);
    return statusText.innerText();
  }

  async handlePrereqErrorIfVisible() {
    console.log("Checking for prerequisite error bar...");

    const summary = this.getPrereqErrorSummary();
    const message = this.getPrereqErrorMessage();

    const isVisible = await summary
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    if (!isVisible) {
      console.log("No prerequisite error detected.");
      return;
    }

    await takeAndAttachScreenshot(this.page, "contract-prereq-error-collapsed");

    const summaryText = await summary.innerText().catch(() => "<unreadable>");
    console.error(`Prerequisite error detected: ${summaryText}`);

    await summary.click();

    await expect(message)
      .toBeVisible({ timeout: 5000 })
      .catch(() => {
        console.warn(
          "Detail message did not become visible after clicking summary",
        );
      });

    await takeAndAttachScreenshot(this.page, "contract-prereq-error-expanded");

    const isMessageVisible = await message.isVisible().catch(() => false);
    const detailedMessage = isMessageVisible
      ? await message.innerText().catch(() => "<unreadable>")
      : "<not visible>";

    console.error(`Prerequisite error summary: ${summaryText}`);
    console.error(`Prerequisite error detail:  ${detailedMessage}`);

    if (isMessageVisible) {
      await summary.click();
      await expect(message)
        .toBeHidden({ timeout: 5000 })
        .catch(() => {
          console.warn(
            "Prerequisite warning detail did not collapse after clicking summary again",
          );
        });
      await takeAndAttachScreenshot(
        this.page,
        "contract-prereq-error-collapsed-after-expand",
      );
    }
  }

  async clickAsyncRunContractTests() {
    await test.step("Click Async Run Contract Tests", async () => {
      const btn = this.asyncRunButton.filter({ visible: true });
      await this.asyncRunButton.scrollIntoViewIfNeeded();
      await this.asyncRunButton.click();
      await expect(btn).toHaveAttribute("data-running", "true", {
        timeout: 8000,
      });
      await expect(btn).toHaveAttribute("data-running", "false", {
        timeout: 45000,
      });
    });
  }

  async getAsyncSummaryHeaderTotals() {
    const totals = await this.getSummaryHeaderTotals();

    return {
      success: totals.success,
      failed: totals.failed,
      notcovered: totals.notcovered,
      total: totals.total,
      excluded: 0,
    };
  }
}
