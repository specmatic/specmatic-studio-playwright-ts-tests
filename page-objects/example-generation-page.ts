import { takeAndAttachScreenshot } from "../utils/screenshotUtils";
import { Page, Locator, expect, type TestInfo } from "@playwright/test";
import { SideBarPage } from "./side-bar-page";

export class ExampleGenerationPage {
  readonly page: Page;
  readonly specTree: Locator;
  readonly sideBar: SideBarPage;
  readonly exampleGenerationTab: Locator;
  readonly generateExamplesBtn: Locator;
  readonly validExamplesTable: Locator;
  readonly invalidExamplesTable: Locator;
  readonly downloadExamplesBtn: Locator;
  readonly testInfo?: TestInfo;
  readonly eyes?: any;

  constructor(page: Page, testInfo?: TestInfo, eyes?: any) {
    this.page = page;
    this.specTree = page.locator("#spec-tree");
    this.sideBar = new SideBarPage(page, testInfo, eyes);
    this.exampleGenerationTab = page.locator("#example-generation-tab");
    this.generateExamplesBtn = page.locator("button#generate-examples");
    this.validExamplesTable = page.locator("#valid-examples-table");
    this.invalidExamplesTable = page.locator("#invalid-examples-table");
    this.downloadExamplesBtn = page.locator("button#download-examples");
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

  async clickGenerateExamples() {
    const examplesBtn = this.page.getByText(/Generate valid examples/i);
    await examplesBtn.click({ force: true });
    await takeAndAttachScreenshot(
      this.page,
      "clicked-generate-examples-screenshot",
      this.eyes,
    );
    return examplesBtn;
  }

  async clickGenerateButton(endpoint: string, responseCode: number) {
    // Use XPath inside the iframe to find the visible Generate button for the correct endpoint row
    const iframe = await this.waitForExamplesIFrame();
    const xpath = `//tr[@data-raw-path="/${endpoint}" and .//td[@class='response-cell']/p[text()="${responseCode}"]]//button[(@aria-label="Generate" or @aria-label="Generate More") and not(contains(@class, 'hidden')) and not(contains(@style, 'display: none'))]`;
    const generateBtns = iframe.locator(xpath);
    // Wait for at least one button to exist before checking visibility
    const count = await generateBtns.count();
    if (count === 0) {
      throw new Error(
        `No generate button found for endpoint: ${endpoint}, responseCode: ${responseCode}`,
      );
    }
    await expect(generateBtns.first()).toBeVisible({ timeout: 4000 });
    await generateBtns.first().click();
    await takeAndAttachScreenshot(
      this.page,
      `clicked-generate-${endpoint}-${responseCode}-screenshot`,
      this.eyes,
    );
  }

  async verifyGenerateButtonNotVisible(endpoint: string, responseCode: number) {
    const rowLocator = this.page.locator(`tr[data-raw-path="/${endpoint}"]`);
    const responseCell = rowLocator
      .locator("td.response-cell")
      .filter({ has: this.page.getByText(`${responseCode}`) });
    const generateBtn = responseCell.locator(
      'button[aria-label="Generate More"]',
    );
    await expect(generateBtn).toBeHidden({ timeout: 4000 });
  }

  async verifyExampleFileNameVisible(endpoint: string, responseCode: number) {
    // Use iframe context and XPath to find a <span> in any <td> in the correct row whose text contains both endpoint and response code
    const iframe = await this.waitForExamplesIFrame();
    const rowXpath = `//tr[@data-raw-path="/${endpoint}" and .//td[@class='response-cell']/p[text()="${responseCode}"]]`;
    const fileNameSpanXpath = `${rowXpath}//td/span[contains(text(), '${endpoint}') and contains(text(), '${responseCode}')]`;
    const fileNameSpan = iframe.locator(fileNameSpanXpath);
    await expect(fileNameSpan).toBeVisible({ timeout: 4000 });
    const fileNameText = (await fileNameSpan.textContent())?.trim();
    expect(fileNameText).toContain(endpoint);
    expect(fileNameText).toContain(String(responseCode));
    await takeAndAttachScreenshot(
      this.page,
      `example-file-name-visible-${endpoint}-${responseCode}-screenshot`,
      this.eyes,
    );
  }

  async verifyValidateButtonVisible(endpoint: string, responseCode: number) {
    // Use iframe context and XPath to find the Validate button for the correct endpoint and response code
    const iframe = await this.waitForExamplesIFrame();
    const xpath = `//tr[@data-raw-path="/${endpoint}" and .//td[@class='response-cell']/p[text()="${responseCode}"]]//button[@aria-label="Validate"]`;
    const validateBtn = iframe.locator(xpath);
    await expect(validateBtn).toBeVisible({ timeout: 4000 });
  }

  async clickViewDetails(endpoint: string, responseCode: number) {
    // Use iframe context and XPath to find the View Details element for the correct endpoint and response code
    const iframe = await this.waitForExamplesIFrame();
    // Find the row for the endpoint and response code, then the cell containing 'View Details'
    const xpath = `//tr[@data-raw-path="/${endpoint}" and .//td[@class='response-cell']/p[text()="${responseCode}"]]//span[contains(text(), 'View Details')]`;
    const viewDetailsSpan = iframe.locator(xpath);
    await expect(viewDetailsSpan).toBeVisible({ timeout: 4000 });
    await viewDetailsSpan.click();
    await takeAndAttachScreenshot(
      this.page,
      `view-details-${endpoint}-${responseCode}-screenshot`,
      this.eyes,
    );
  }

  async clickGoBack(endpoint: string, responseCode: number) {
    // Use iframe context to find the Go Back button
    const iframe = await this.waitForExamplesIFrame();
    // The button text is '← Go Back' or 'Go Back'
    const goBackBtn = iframe.getByRole("button", { name: /Go Back|← Go Back/ });
    await expect(goBackBtn).toBeVisible({ timeout: 4000 });
    await goBackBtn.click();
    await takeAndAttachScreenshot(
      this.page,
      `go-back-${endpoint}-${responseCode}-screenshot`,
      this.eyes,
    );
  }

  async clickValidateButton(endpoint: string, responseCode: number) {
    // Use iframe context and XPath to find the Validate button for the correct endpoint and response code
    const iframe = await this.waitForExamplesIFrame();
    const xpath = `//tr[@data-raw-path="/${endpoint}" and .//td[@class='response-cell']/p[text()="${responseCode}"]]//button[@aria-label="Validate"]`;
    const validateBtn = iframe.locator(xpath);
    await expect(validateBtn).toBeVisible({ timeout: 4000 });
    await validateBtn.click();
    await takeAndAttachScreenshot(
      this.page,
      `clicked-validate-${endpoint}-${responseCode}-screenshot`,
      this.eyes,
    );
  }

  private async waitForExamplesIFrame() {
    await this.page
      .locator("iframe[data-examples-server-base]")
      .waitFor({ state: "attached", timeout: 10000 });
    const iframe = this.page.frameLocator("iframe[data-examples-server-base]");
    return iframe;
  }
}
