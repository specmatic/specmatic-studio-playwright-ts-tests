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
    const runButton = this.page.locator('button.run[data-type="test"][data-running="false"]');
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
    const runningButton = this.page.getByRole("button", { name: /^Running$/ });
    await runningButton.waitFor({ state: "detached", timeout: 60000 });
    await this.page
      .getByText("Test Completed", { exact: false })
      .waitFor({ timeout: 10000 });
    await takeAndAttachScreenshot(
      this.page,
      "test-completed-screenshot",
      this.eyes,
    );
  }

  async verifyTestResults({
    Success,
    Failed,
    Errors,
    Skipped,
    Excluded,
    Total,
  }: {
    Success: number;
    Failed: number;
    Errors: number;
    Skipped: number;
    Excluded: number;
    Total: number;
  }) {
    // Assumes result summary is visible as text on the page
    await expect(this.page.getByText(`Success: ${Success}`)).toBeVisible({
      timeout: 4000,
    });
    await expect(this.page.getByText(`Failed: ${Failed}`)).toBeVisible({
      timeout: 4000,
    });
    await expect(this.page.getByText(`Errors: ${Errors}`)).toBeVisible({
      timeout: 4000,
    });
    await expect(this.page.getByText(`Skipped: ${Skipped}`)).toBeVisible({
      timeout: 4000,
    });
    await expect(this.page.getByText(`Excluded: ${Excluded}`)).toBeVisible({
      timeout: 4000,
    });
    await expect(this.page.getByText(`Total: ${Total}`)).toBeVisible({
      timeout: 4000,
    });
    await takeAndAttachScreenshot(
      this.page,
      "test-results-verified-screenshot",
      this.eyes,
    );
  }
}
