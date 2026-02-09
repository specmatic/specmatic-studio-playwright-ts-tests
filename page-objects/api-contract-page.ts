import { test, Locator, expect, type TestInfo, Page } from "@playwright/test";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";
import { BasePage } from "./base-page";
import { OpenAPISpecTabPage } from "./openapi-spec-tab-page";

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
    this.openApiTabPage = new OpenAPISpecTabPage(this);
  }
  async openExecuteContractTestsTab() {
    return this.openApiTabPage.openExecuteContractTestsTab();
  }

  async enterServiceUrl(serviceUrl: string) {
    await test.step(`Enter service URL: '${serviceUrl}'`, async () => {
      await expect(this.serviceUrlInput).toBeVisible({ timeout: 4000 });
      await this.serviceUrlInput.fill(serviceUrl);
      await takeAndAttachScreenshot(
        this.page,
        "service-url-entered-screenshot",
        this.eyes,
      );
    });
  }

  async clickRunContractTests() {
    await test.step("Run Contract Tests", async () => {
      try {
        await expect(this.runButton).toBeVisible({ timeout: 10000 });
        await expect(this.runButton).toBeEnabled({ timeout: 10000 });
      } catch (e) {
        await takeAndAttachScreenshot(
          this.page,
          "error-run-btn-not-visible",
          this.eyes,
        );
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
          this.eyes,
        );
        throw new Error(`Run button not interactable: ${e}`);
      }
      await this.runButton.click();
      await takeAndAttachScreenshot(
        this.page,
        "clicked-run-contract-tests-screenshot",
        this.eyes,
      );
      await this.waitForTestCompletion();
    });
  }

  async waitForTestCompletion() {
    await this.waitForTestsToStartRunning();

    await this.waitForTestsToCompleteExecution();

    await takeAndAttachScreenshot(
      this.page,
      "test-completed-screenshot",
      this.eyes,
    );
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
        this.eyes,
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
        this.eyes,
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
        this.eyes,
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

  async selectTestForExclusion(path: string, method: string, response: string) {
    const checkbox = this.exclusionCheckboxLocator(path, method, response);
    try {
      await expect(checkbox).toBeVisible({ timeout: 15000 });
    } catch (e) {
      await takeAndAttachScreenshot(
        this.page,
        `error-checkbox-not-visible-${path}-${method}-${response}`,
        this.eyes,
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

  async verifyTestExclusion() {
    const excludedCount = this.countsContainer.locator(
      'li[data-type="excluded"] span',
    );
    await expect(excludedCount).toBeVisible({ timeout: 10000 });
    await takeAndAttachScreenshot(
      this.page,
      "test-exclusion-verified",
      this.eyes,
    );
  }

  async verifyFinalCounts(expected: { Excluded: number; Total: number }) {
    await expect(this.excludedCountSpan.last()).toHaveText(
      String(expected.Excluded),
      {
        timeout: 10000,
      },
    );
    await expect(this.totalSpan.last()).toHaveText(String(expected.Total), {
      timeout: 10000,
    });
  }
}
