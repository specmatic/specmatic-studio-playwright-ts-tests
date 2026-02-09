import { Locator, expect, type TestInfo, Page } from "@playwright/test";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";
import { BasePage } from "./base-page";

export class ApiContractPage extends BasePage {
  readonly specTree: Locator;
  readonly testBtn: Locator;
  readonly serviceUrlInput: Locator;
  readonly runButton: Locator;
  readonly runningButton: Locator;
  readonly countsContainer: Locator;
  readonly totalSpan: Locator;
  readonly excludeButton: Locator;
  readonly pathHeader: Locator;
  readonly responseHeader: Locator;
  readonly uniqueContainer: Locator;
  readonly excludeCountSpan: Locator;
  readonly totalCountSpan: Locator;
  readonly verifyTotalSpan: Locator;
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
    this.countsContainer = page
      .locator('ol.counts[data-filter="total"]')
      .filter({ visible: true });
    this.totalSpan = this.countsContainer.locator('li[data-type="total"] span');
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
    this.excludeButton = page.locator("#exclude-button");
    this.excludeCountSpan = page.locator("#exclude-count-span");
    this.totalCountSpan = page.locator("#total-count-span");
    this.verifyTotalSpan = page.locator("#verify-total-span");
    this.rowLocator = (path: string, method: string, response: string) =>
      page.locator(
        `tr[data-path='${path}'][data-method='${method}'][data-response='${response}']`,
      );
    this.remarkCellLocator = (row: Locator) => row.locator("td.remark-cell");
    this.pollDataRunning = async () => {
      const result = await page.evaluate(() =>
        document.querySelector("[data-running]")?.getAttribute("data-running"),
      );
      return result ?? null;
    };
    this.exclusionCheckboxLocator = (
      path: string,
      method: string,
      response: string,
    ) =>
      page.locator(
        `input[type='checkbox'][data-path='${path}'][data-method='${method}'][data-response='${response}']`,
      );
  }

  async selectSpec(specName: string) {
    await expect(this.specTree).toBeVisible({ timeout: 4000 });
    const specLocator = this.specTree.locator("text=" + specName);
    await expect(specLocator).toBeVisible({ timeout: 4000 });
    await specLocator.click({ force: true });
    await takeAndAttachScreenshot(
      this.page,
      "selected-spec-screenshot",
      this.eyes,
    );
    return specLocator;
  }

  async clickExecuteContractTests() {
    await expect(this.testBtn).toBeVisible({ timeout: 4000 });
    await this.testBtn.click({ force: true });
    await takeAndAttachScreenshot(
      this.page,
      "clicked-execute-tests-screenshot",
      this.eyes,
    );
    return this.testBtn;
  }
  async enterServiceUrl(serviceUrl: string) {
    await expect(this.serviceUrlInput).toBeVisible({ timeout: 4000 });
    await this.serviceUrlInput.fill(serviceUrl);
    await takeAndAttachScreenshot(
      this.page,
      "service-url-entered-screenshot",
      this.eyes,
    );
  }

  async clickRunContractTests() {
    await expect(this.runButton).toBeVisible({ timeout: 5000 });
    await expect(this.runButton).toBeEnabled({ timeout: 5000 });
    const runBtnSelector = 'button.run[data-type="test"][data-running="false"]';
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
      { timeout: 5000 },
    );
    await this.runButton.click();
    await takeAndAttachScreenshot(
      this.page,
      "clicked-run-contract-tests-screenshot",
      this.eyes,
    );
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
            intervals: [1000],
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
    await expect
      .poll(this.pollDataRunning, {
        timeout: 5000,
        message: "Waiting for contract tests to start",
      })
      .toBe("true");
  }

  async verifyTestResults() {
    const isAnyNumber = /^\d+$/;
    await expect(this.verifyTotalSpan).toHaveText(isAnyNumber, {
      timeout: 10000,
    });
    const value = await this.verifyTotalSpan.innerText();
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
    await expect(checkbox).toBeVisible({ timeout: 10000 });
    const isChecked = await checkbox.isChecked();
    if (!isChecked) {
      await checkbox.click();
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
    await expect(this.excludeCountSpan.last()).toHaveText(
      String(expected.Excluded),
      {
        timeout: 10000,
      },
    );
    await expect(this.totalCountSpan.last()).toHaveText(
      String(expected.Total),
      {
        timeout: 10000,
      },
    );
  }
}
