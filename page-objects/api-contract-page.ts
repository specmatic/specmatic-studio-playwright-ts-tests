import { takeAndAttachScreenshot } from "../utils/screenshotUtils";
import { Page, Locator, expect, type TestInfo } from "@playwright/test";
import { SideBarPage } from "./side-bar-page";

export class ApiContractPage {
  readonly page: Page;
  readonly specTree: Locator;
  readonly sideBar: SideBarPage;
  readonly testBtn: Locator;
  readonly testInfo?: TestInfo;
  readonly eyes?: any;

  readonly serviceUrlInput: Locator;
  readonly runButton: Locator;
  readonly runningButton: Locator;
  readonly countsContainer: Locator;
  readonly totalSpan: Locator;
  readonly rowLocator: (
    path: string,
    method: string,
    response: string,
  ) => Locator;
  readonly remarkCellLocator: (row: Locator) => Locator;
  readonly pollDataRunning: () => Promise<string | null>;

  constructor(page: Page, testInfo?: TestInfo, eyes?: any) {
    this.page = page;
    this.specTree = page.locator("#spec-tree");
    this.sideBar = new SideBarPage(page);
    this.testBtn = page.getByText(/Execute contract tests/i);
    this.testInfo = testInfo;
    this.eyes = eyes;

    this.serviceUrlInput = page.getByPlaceholder("Service URL");
    this.runButton = page.locator(
      'button.run[data-type="test"][data-running="false"]',
    );
    this.runningButton = page.locator('button.run[data-type="test"]');
    this.countsContainer = page
      .locator("ol.counts")
      .filter({ visible: true })
      .first();
    this.totalSpan = this.countsContainer.locator('li[data-type="total"] span');
    this.rowLocator = (path: string, method: string, response: string) =>
      page
        .locator("tbody tr")
        .filter({
          has: page.locator(`td[data-key=\"path\"][data-value=\"${path}\"]`),
        })
        .filter({
          has: page.locator(
            `td[data-key=\"method\"][data-value=\"${method}\"]`,
          ),
        })
        .filter({
          has: page.locator(
            `td[data-key=\"response\"][data-value=\"${response}\"]`,
          ),
        })
        .first();
    this.remarkCellLocator = (row: Locator) =>
      row.locator('td[data-key="remark"]');

    this.pollDataRunning = async () => {
      return await this.runningButton.getAttribute("data-running");
    };
  }

  async goto() {
    await this.page.goto("/");
    await takeAndAttachScreenshot(
      this.page,
      "app-loaded-screenshot",
      this.eyes,
    );
  }

  async ensureSidebarOpen() {
    await this.sideBar.ensureSidebarOpen();
    await takeAndAttachScreenshot(
      this.page,
      "sidebar-opened-screenshot",
      this.eyes,
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
    // Wait for the button to not be covered by any overlay
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
            // Optionally log progress
            console.log(
              `[waitForTestsToCompleteExecution] data-running: ${value}`,
            );
            return value;
          },
          {
            timeout: 180000,
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
    await expect(this.totalSpan).toHaveText(isAnyNumber, { timeout: 10000 });
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
    // Wait for at least one row to exist before checking visibility
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
    console.log(
      `Verified remark ${expectedRemark} for ${method} ${path} with response ${response}`,
    );
  }
}
