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

  constructor(page: Page, testInfo?: TestInfo, eyes?: any) {
    this.page = page;
    this.specTree = page.locator("#spec-tree");
    this.sideBar = new SideBarPage(page);
    this.testBtn = page.getByText(/Execute contract tests/i);
    this.testInfo = testInfo;
    this.eyes = eyes;
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
    // Assumes a textbox for Service URL is present and can be located by label or placeholder
    const serviceUrlInput = this.page.getByPlaceholder("Service URL");
    await expect(serviceUrlInput).toBeVisible({ timeout: 4000 });
    await serviceUrlInput.fill(serviceUrl);
    await takeAndAttachScreenshot(
      this.page,
      "service-url-entered-screenshot",
      this.eyes,
    );
  }

  async clickRunContractTests() {
    // Select the correct 'Run' button for contract tests (data-type='test')
    const runButton = this.page.locator(
      'button.run[data-type="test"][data-running="false"]',
    );
    await expect(runButton).toBeVisible({ timeout: 4000 });
    await runButton.click();
    await takeAndAttachScreenshot(
      this.page,
      "clicked-run-contract-tests-screenshot",
      this.eyes,
    );
  }

  async waitForTestCompletion() {
    // Wait for the button to change from 'Running' back to 'Run' and for dialog with 'Test Completed'
    const runningButton = this.page.locator('button.run[data-type="test"]');

    // First, wait for the button to start running (data-running="true")
    await expect
      .poll(
        async () => {
          return await runningButton.getAttribute("data-running");
        },
        {
          timeout: 10000,
          message: "Waiting for contract tests to start",
        },
      )
      .toBe("true");

    // Then, wait for the button to finish running (data-running="false")
    await expect
      .poll(
        async () => {
          return await runningButton.getAttribute("data-running");
        },
        {
          timeout: 120000,
          message: "Waiting for contract tests to complete",
        },
      )
      .toBe("false");

    // await this.page
    //   .getByText("Test Completed", { exact: false })
    //   .waitFor({ timeout: 10000 });
    await takeAndAttachScreenshot(
      this.page,
      "test-completed-screenshot",
      this.eyes,
    );
  }

  async verifyTestResults() {
    const countsContainer = this.page
      .locator("ol.counts")
      .filter({ visible: true })
      .first();

    const isAnyNumber = /^\d+$/;

    const totalSpan = countsContainer.locator('li[data-type="total"] span');

    await expect(totalSpan).toHaveText(isAnyNumber, { timeout: 10000 });

    const value = await totalSpan.innerText();

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
    const row = this.page
      .locator("tbody tr")
      .filter({
        has: this.page.locator(`td[data-key="path"][data-value="${path}"]`),
      })
      .filter({
        has: this.page.locator(`td[data-key="method"][data-value="${method}"]`),
      })
      .filter({
        has: this.page.locator(
          `td[data-key="response"][data-value="${response}"]`,
        ),
      })
      .first();

    await expect(row).toBeVisible({ timeout: 10000 });

    const remarkCell = row.locator('td[data-key="remark"]');

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
