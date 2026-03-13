import { OpenAPISpecTabPage } from "./openapi-spec-tab-page";
import {
  Locator,
  expect,
  type TestInfo,
  Page,
  type Frame,
  test,
  FrameLocator,
} from "@playwright/test";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";
import { BasePage } from "./base-page";
import { Edit } from "../utils/types/json-edit.types";
import { SpecEditorPage } from "./spec-editor-page";



export class ExampleGenerationPage extends BasePage {
  readonly openApiTabPage: OpenAPISpecTabPage;
  protected readonly specTree: Locator;
  private readonly generateExamplesBtn: Locator;
  private readonly validExamplesTable: Locator;
  private readonly invalidExamplesTable: Locator;
  private readonly downloadExamplesBtn: Locator;
  private readonly exampleDiv: Locator;
  private readonly examplesIframe: Locator;
  private readonly selectAllCheckboxSelector: string;
  private readonly bulkDeleteBtnSelector: string;
  private readonly bulkGenerateBtnSelector: string;
  private readonly bulkValidateBtnSelector: string;
  private readonly bulkFixBtnSelector: string;
  private readonly inlineBtnSelector: string;
  private readonly specSection: Locator;
  private readonly specEditorSection: Locator;
  private readonly specTabLocator: Locator;
  private readonly specEditorHelper: SpecEditorPage;

  constructor(page: Page, testInfo: TestInfo, eyes: any, specName: string) {
    super(page, testInfo, eyes, specName);
    this.specTree = page.locator("#spec-tree");
    this.specSection = page.locator(
      `xpath=//div[contains(@id,"${specName}") and @data-mode="example"]`,
    );
    this.specEditorSection = page.locator(
      `xpath=//div[contains(@id,"${specName}") and @data-mode="spec"]`,
    );
    this.specTabLocator = page.locator('li.tab[data-type="spec"]').first();
    this.generateExamplesBtn = this.specSection.locator(
      `xpath=.//p[contains(text(),"Generate valid examples")]`,
    );
    this.exampleDiv = this.specSection.locator(`div.example`);
    this.examplesIframe = this.exampleDiv.locator(
      "iframe[data-examples-server-base]",
    );
    this.validExamplesTable = this.specSection.locator("#valid-examples-table");
    this.invalidExamplesTable = this.specSection.locator(
      "#invalid-examples-table",
    );
    this.downloadExamplesBtn = this.specSection.locator(
      "button#download-examples",
    );
    this.openApiTabPage = new OpenAPISpecTabPage(this);
    this.selectAllCheckboxSelector = "input#select-all";
    this.bulkDeleteBtnSelector = "button#bulk-delete";
    this.bulkGenerateBtnSelector = "button#bulk-generate";
    this.bulkValidateBtnSelector = "button#bulk-validate";
    this.inlineBtnSelector = "button#import";
    this.bulkFixBtnSelector = "button#bulk-fix";
    this.specEditorHelper = new SpecEditorPage(page);
  }

  private async openExampleGenerationTab() {
    console.log("Opening Example Generation tab");
    return this.openApiTabPage.openExampleGenerationTab();
  }

  private async clickGenerateButton(
    endpoint: string,
    responseCode: number,
    withVisualValidation = true,
  ) {
    // Use XPath inside the iframe to find the visible Generate button for the correct endpoint row
    const iframe = await this.waitForExamplesIFrame();
    const xpath = `//tr[@data-raw-path="/${endpoint}" and .//td[@class='response-cell']/p[text()="${responseCode}"]]//button[(@aria-label="Generate" or @aria-label="Generate More") and not(contains(@class, 'hidden')) and not(contains(@style, 'display: none'))]`;
    const generateBtns = iframe.locator(xpath);
    // Wait for at least one button to exist before checking visibility
    const count = await generateBtns.count();
    if (count === 0) {
      await this.printDebugInfoForAvailableEndpoints(
        iframe,
        endpoint,
        responseCode,
      );
      throw new Error(
        `No generate button found for endpoint: ${endpoint}, responseCode: ${responseCode}`,
      );
    }
    const btn = generateBtns.first();
    await expect(btn).toBeVisible({ timeout: 4000 });
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    await iframe.waitForSelector(`text=Example Generated`, {
      timeout: 5000,
    });
    await takeAndAttachScreenshot(
      this.page,
      `clicked-generate-${endpoint}-${responseCode}`,
      withVisualValidation ? this.eyes : undefined,
    );
    await this.verifyTitleAndCloseDialog("Example Generated");
  }

  private async printDebugInfoForAvailableEndpoints(
    iframe: import("@playwright/test").Frame,
    endpoint: string,
    responseCode: number,
  ) {
    const allRows = await iframe.locator("//tr[@data-raw-path]").all();
    const debugRows = [];
    for (const row of allRows) {
      const rawPath = await row.getAttribute("data-raw-path");
      // Find all response codes in this row
      const responseCells = await row.locator("td.response-cell p").all();
      const codes = [];
      for (const cell of responseCells) {
        const text = (await cell.textContent())?.trim();
        if (text) codes.push(text);
      }
      debugRows.push({ rawPath, codes });
    }
    console.error(
      `No generate button found for endpoint: ${endpoint}, responseCode: ${responseCode}`,
    );
    console.error(
      "Available rows (data-raw-path and response codes):",
      JSON.stringify(debugRows, null, 2),
    );
  }

  private async verifyGenerateButtonNotVisible(
    endpoint: string,
    responseCode: number,
  ) {
    const rowLocator = this.page.locator(`tr[data-raw-path="/${endpoint}"]`);
    const responseCell = rowLocator
      .locator("td.response-cell")
      .filter({ has: this.page.getByText(`${responseCode}`) });
    const generateBtn = responseCell.locator(
      'button[aria-label="Generate More"]',
    );
    await expect(generateBtn).toBeHidden({ timeout: 4000 });
  }

  private async verifyExampleFileNameVisible(
    endpoint: string,
    responseCode: number,
    withVisualValidation = true,
  ) {
    const iframe = await this.waitForExamplesIFrame();
    const rowXpath = `//tr[contains(@data-raw-path, "/${endpoint}") and .//td[@class='response-cell']//p[contains(normalize-space(.), "${responseCode}")]]`;
    const fileNameSpanXpath = `${rowXpath}//td/span[contains(., '${responseCode}')]`;
    console.log(
      `\t\tLooking for example file name span with XPath: ${fileNameSpanXpath}`,
    );
    const fileNameSpan = iframe.locator(fileNameSpanXpath);
    await expect(fileNameSpan).toBeVisible({ timeout: 4000 });
    const fileNameText = (await fileNameSpan.textContent())?.trim();
    expect(fileNameText).toContain(String(responseCode));
    await takeAndAttachScreenshot(
      this.page,
      `example-file-name-visible-${endpoint}-${responseCode}`,
      withVisualValidation ? this.eyes : undefined,
    );
  }

  private async verifyValidateButtonVisible(
    endpoint: string,
    responseCode: number,
    withVisualValidation = true,
  ) {
    const iframe = await this.waitForExamplesIFrame();
    await takeAndAttachScreenshot(
      this.page,
      `validate-button-visible-${endpoint}-${responseCode}`,
      withVisualValidation ? this.eyes : undefined,
    );
    const xpath = `//tr[@data-raw-path="/${endpoint}" and .//td[@class='response-cell']/p[text()="${responseCode}"]]//button[@aria-label="Validate"]`;
    const validateBtn = iframe.locator(xpath);
    await expect(validateBtn).toBeVisible({ timeout: 4000 });
  }

  async clickViewDetails(
    endpoint: string,
    responseCode: number,
    withVisualValidation = true,
    targetNewlyGenerated = false,
  ) {
    const iframe = await this.waitForExamplesIFrame();
    let viewDetailsSpan: Locator;

    if (targetNewlyGenerated) {
      // Target the last non-main row – the one just created by Generate More.
      // These rows have class="response-cell hidden" so we use a CSS selector
      // and force:true to click the hidden span without needing hover.
      const row = iframe
        .locator(`tr[data-raw-path="/${endpoint}"][data-main="false"]`)
        .last();
      await expect(row).toBeAttached({ timeout: 5000 });
      viewDetailsSpan = row.locator('span:has-text("View Details")');
    } else {
      const xpath = `//tr[@data-raw-path="/${endpoint}" and .//td[@class='response-cell']/p[text()="${responseCode}"]]//span[contains(text(), 'View Details')]`;
      viewDetailsSpan = iframe.locator(xpath);
      await expect(viewDetailsSpan).toBeVisible({ timeout: 4000 });
    }

    await viewDetailsSpan.click({ force: true });
    await this.page.waitForTimeout(2000);
    await takeAndAttachScreenshot(
      this.page,
      `view-details-${endpoint}-${responseCode}`,
      withVisualValidation ? this.eyes : undefined,
    );
  }

  private async clickGoBack(endpoint: string, responseCode: number) {
    const iframe = await this.waitForExamplesIFrame();
    const goBackBtn = iframe.getByRole("button", { name: /Go Back|← Go Back/ });
    await expect(goBackBtn).toBeVisible({ timeout: 4000 });
    await expect(goBackBtn).toBeEnabled({ timeout: 4000 });
    await goBackBtn.click();
    await takeAndAttachScreenshot(
      this.page,
      `go-back-${endpoint}-${responseCode}`,
    );
  }

  private async clickValidateButton(
    endpoint: string,
    responseCode: number,
    withVisualValidation = true,
  ) {
    const iframe = await this.waitForExamplesIFrame();
    const xpath = `//tr[@data-raw-path="/${endpoint}" and .//td[@class='response-cell']/p[text()="${responseCode}"]]//button[@aria-label="Validate"]`;
    const validateBtn = iframe.locator(xpath);
    await expect(validateBtn).toBeVisible({ timeout: 4000 });
    await validateBtn.click();
    await takeAndAttachScreenshot(
      this.page,
      `clicked-validate-${endpoint}-${responseCode}`,
      withVisualValidation ? this.eyes : undefined,
    );
    await this.verifyTitleAndCloseDialog("Valid Example");
  }

  private async verifyTitleAndCloseDialog(expectedTitle: string) {
    console.log(`\tVerifying dialog with expected text: '${expectedTitle}'`);
    await takeAndAttachScreenshot(
      this.page,
      `before-closing-dialog-${expectedTitle.replace(/\s+/g, "-").toLowerCase()}`,
    );

    const { alert } = await this.getAlertContainerFrameAndLocator();
    await expect(alert).toBeAttached({ timeout: 15000 });

    const title = await this.getDialogTitle(alert);
    const message = await this.getDialogMessage(alert);
    expect.soft(title).toContain(expectedTitle);

    await alert.locator("button").click();
    console.log(
      `\t\tClicked close button on dialog with title: '${expectedTitle}' Vs Actual: '${title}'`,
    );
    await this.page.waitForTimeout(1000);
    await takeAndAttachScreenshot(
      this.page,
      `after-closing-dialog-${expectedTitle.replace(/\s+/g, "-").toLowerCase()}`,
    );
    await expect(alert).toBeHidden();
  }

  private async getAlertContainerFrameAndLocator(): Promise<{
    frame: import("@playwright/test").Frame;
    alert: Locator;
  }> {
    const iframeHandle = await this.examplesIframe.elementHandle();
    const frame = await iframeHandle?.contentFrame();
    if (!frame) {
      throw new Error(
        "Frame is null or undefined in getAlertContainerFrameAndLocator",
      );
    }
    const alert = frame.locator("#alert-container");
    return { frame, alert };
  }

  private async getDialogTitle(alert: Locator): Promise<string> {
    // Assumes the first <p> or <pre> is the title
    const dialogTitle = await alert.locator("p, pre").first().innerText();
    console.log("\t\tActual dialog title:", dialogTitle);
    return dialogTitle;
  }

  private async getDialogMessage(alert: Locator): Promise<string> {
    // Assumes the second <p> or <pre> is the message, if present
    const elements = await alert.locator("p, pre").all();
    let dialogMessage = "";
    if (elements.length > 1) {
      dialogMessage = await elements[1].innerText();
    } else if (elements.length === 1) {
      dialogMessage = await elements[0].innerText();
    }
    console.log("\t\tActual dialog message:", dialogMessage);
    return dialogMessage;
  }

  private async saveAndValidate(withVisualValidation = true) {
    await test.step(`Click 'Save & Validate' button`, async () => {
      const iframe = await this.waitForExamplesIFrame();
      const saveValidateBtn = iframe.locator("button#bulk-validate");
      await this.page.waitForTimeout(1000);
      await expect(saveValidateBtn).toBeVisible({ timeout: 4000 });
      await expect(saveValidateBtn).toBeEnabled({ timeout: 4000 });
      await saveValidateBtn.click();
      await this.page.waitForTimeout(1000);
      await takeAndAttachScreenshot(
        this.page,
        "clicked-save-and-validate",
        withVisualValidation ? this.eyes : undefined,
      );
    });
  }

  async deleteGeneratedExamples() {
    await test.step(`Delete all generated examples if present`, async () => {
      console.log("Attempting to delete generated examples if present");
      const iframe = await this.waitForExamplesIFrame();
      await this.selectAll(iframe);

      const bulkDeleteBtn = iframe.locator(this.bulkDeleteBtnSelector);
      let deleteClicked = false;
      if (await bulkDeleteBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await takeAndAttachScreenshot(this.page, `click-bulk-delete`);
        await bulkDeleteBtn.click();
        deleteClicked = true;
        console.log("\tbulk-delete button clicked");
        await takeAndAttachScreenshot(this.page, `clicked-bulk-delete`);
      }

      if (deleteClicked) {
        await this.verifyTitleAndCloseDialog("Delete Examples Complete");
      } else {
        console.log("No examples to delete");
        await this.uncheckSelectAll(iframe); // Uncheck select-all if we had checked it but there were no examples to delete
      }

      await takeAndAttachScreenshot(
        this.page,
        `examples-deleted-or-none-to-delete`,
      );
    });
  }

  private async selectAll(iframe: import("@playwright/test").Frame) {
    const selectAll = iframe.locator(this.selectAllCheckboxSelector);
    await selectAll.waitFor({ timeout: 3000 });
    const checkboxes = await selectAll.all();
    console.log(`\tselect-all checkbox found, count: ${checkboxes.length}`);
    let allChecked = true;
    for (let i = 0; i < checkboxes.length; i++) {
      let checked = await checkboxes[i].isChecked();
      let attempts = 0;
      while (!checked && attempts < 3) {
        await checkboxes[i].click({ force: true });
        await this.page.waitForTimeout(200 * (attempts + 1)); // Wait a bit longer after each attempt
        checked = await checkboxes[i].isChecked();
        console.log(
          `\tselect-all checkbox[${i}] checked after click attempt ${attempts + 1}: ${checked}`,
        );
        attempts++;
      }
      if (!checked) {
        allChecked = false;
        console.log(
          `\tselect-all checkbox[${i}] could not be checked after 3 attempts`,
        );
      }
    }
    // Log final checked state for all checkboxes
    for (let i = 0; i < checkboxes.length; i++) {
      const checkedState = await checkboxes[i].isChecked();
      console.log(`\tselect-all checkbox[${i}] final checked: ${checkedState}`);
    }
    if (!allChecked) {
      throw new Error(
        "selectAll: One or more checkboxes could not be checked after 3 attempts",
      );
    }
    // Also check that at least one is checked for safety
    if (checkboxes.length === 0) {
      throw new Error(
        "selectAll: No checkboxes found for selector 'input#select-all'",
      );
    }
    await takeAndAttachScreenshot(this.page, `select-all-checked`);
  }

  private async uncheckSelectAll(iframe: import("@playwright/test").Frame) {
    const selectAll = iframe.locator(this.selectAllCheckboxSelector);
    await selectAll.waitFor({ timeout: 3000 });
    console.log("\tuncheck select-all checkbox found");
    if (await selectAll.isChecked()) {
      await selectAll.click({ force: true });
      await expect(selectAll).not.toBeChecked({ timeout: 2000 });
      console.log("\tselect-all checkbox unchecked");
      await takeAndAttachScreenshot(this.page, `select-all-unchecked`);
    }
  }

  private async waitForExamplesIFrame() {
    await this.examplesIframe.waitFor({ state: "attached", timeout: 10000 });
    const iframeElement = await this.examplesIframe.elementHandle();
    if (!iframeElement) {
      throw new Error("Could not find the iframe element at index 1");
    }
    const frame = await iframeElement.contentFrame();
    if (!frame) {
      throw new Error("Could not get contentFrame from iframe element");
    }
    console.log("\tSuccessfully got the examples iframe");
    return frame;
  }

  async validateAllExamples() {
    await test.step(`Validate all generated examples`, async () => {
      console.log(`Validating all generated examples`);
      const iframe = await this.waitForExamplesIFrame();
      await this.selectAll(iframe);
      await this.clickBulkValidateButton();

      await this.waitForProcessingToComplete(iframe);
      await this.verifyTitleAndCloseDialog("Example Validations Complete");
      await takeAndAttachScreenshot(
        this.page,
        `validate-examples-for-all-paths`,
        this.eyes,
      );
    });
  }

  async generateAllExamples() {
    await test.step(`Generate example and validate for all paths`, async () => {
      console.log(`Generating and validating example for all paths`);
      const iframe = await this.waitForExamplesIFrame();
      await this.selectAll(iframe);
      await this.clickBulkGenerateButton();

      await this.waitForProcessingToComplete(iframe);
      await takeAndAttachScreenshot(
        this.page,
        `generate-examples-for-all-paths`,
        this.eyes,
      );
    });
  }

  private async waitForProcessingToComplete(
    iframe: import("@playwright/test").Frame,
  ) {
    console.log(`\t\tWaiting for processing to complete...`);
    const processingBtn = iframe.locator("button#bulk-generate", {
      hasText: "Processing",
    });
    // wait for 5 seconds for the processing button to appear in case it takes some time for the generation to start, but if it doesn't appear within that time, we proceed to check for completion to avoid unnecessary test failure
    await processingBtn
      .waitFor({ state: "visible", timeout: 5000 })
      .catch(() => {
        console.log(
          "\t\tProcessing button did not appear within 5 seconds, proceeding to check for generation completion",
        );
      });
    await expect(processingBtn).toBeHidden({ timeout: 60000 });
  }

  async getNumberOfPathMethodsAndResponses(): Promise<number> {
    const iframe = await this.waitForExamplesIFrame();
    const exampleRows = await iframe.locator("tr[data-raw-path]").all();
    console.log(
      `\tTotal number of path-method-response combinations: ${exampleRows.length}`,
    );
    return exampleRows.length;
  }

  async getNumberOfGenerateButtons(): Promise<number> {
    const iframe = await this.waitForExamplesIFrame();
    const generateButtons = await iframe
      .locator('button[aria-label="Generate"]')
      .all();
    console.log(
      `\tNumber of Generate buttons available: ${generateButtons.length}`,
    );
    return generateButtons.length;
  }

  async getNumberOfValidateButtons(): Promise<number> {
    const iframe = await this.waitForExamplesIFrame();
    const validateButtons = await iframe
      .locator('button[aria-label="Validate"]')
      .all();
    console.log(
      `\tNumber of Validate buttons available: ${validateButtons.length}`,
    );
    return validateButtons.length;
  }

  async getNumberOfExamplesValidated(): Promise<number> {
    const iframe = await this.waitForExamplesIFrame();
    const exampleRows = await iframe.locator("tr[data-valid=success]").all();
    console.log(
      `\tTotal endpoints with generated examples: ${exampleRows.length}`,
    );
    return exampleRows.length;
  }

  async getNumberOfExamplesGenerated(): Promise<number> {
    const iframe = await this.waitForExamplesIFrame();
    const exampleRows = await iframe
      .locator("tr[data-example-relative-path]")
      .all();
    console.log(
      `\tTotal endpoints with generated examples: ${exampleRows.length}`,
    );
    return exampleRows.length;
  }

  private async clickBulkGenerateButton() {
    const iframe = await this.waitForExamplesIFrame();
    const bulkGenerateBtn = iframe.locator(this.bulkGenerateBtnSelector);
    await bulkGenerateBtn.waitFor({ state: "visible", timeout: 4000 });
    await expect(bulkGenerateBtn).toBeVisible({ timeout: 4000 });
    await expect(bulkGenerateBtn).toBeEnabled({ timeout: 4000 });
    await bulkGenerateBtn.click();
    await takeAndAttachScreenshot(this.page, "clicked-generate");
  }
  private async clickBulkValidateButton() {
    const iframe = await this.waitForExamplesIFrame();
    const bulkValidateBtn = iframe.locator(this.bulkValidateBtnSelector);
    await bulkValidateBtn.waitFor({ state: "visible", timeout: 4000 });
    await expect(bulkValidateBtn).toBeVisible({ timeout: 4000 });
    await expect(bulkValidateBtn).toBeEnabled({ timeout: 4000 });
    await bulkValidateBtn.click();
    await takeAndAttachScreenshot(this.page, "clicked-validate");
  }

  async inlineExamples() {
    await test.step(`Inline generated examples into the spec file`, async () => {
      console.log(`Inlining examples into the spec file`);
      await takeAndAttachScreenshot(this.page, `before-inline`);
      const iframe = await this.waitForExamplesIFrame();
      const inlineBtn = iframe.locator(this.inlineBtnSelector);
      await inlineBtn.waitFor({ state: "visible", timeout: 4000 });
      await expect(inlineBtn).toBeVisible({ timeout: 4000 });
      await expect(inlineBtn).toBeEnabled({ timeout: 4000 });
      await inlineBtn.click();
      await takeAndAttachScreenshot(
        this.page,
        `all-examples-inlined`,
        this.eyes,
      );
    });
  }

  async getDialogTitleAndMessage(): Promise<[string, string]> {
    return await test.step(`Get dialog title and message`, async () => {
      console.log(`\tGetting dialog title and message`);
      const { alert } = await this.getAlertContainerFrameAndLocator();
      await takeAndAttachScreenshot(this.page, `dialog-title-and-message`);
      const title = await this.getDialogTitle(alert);
      const message = await this.getDialogMessage(alert);
      return [title, message];
    });
  }

  async closeInlineSuccessDialog(expectedTitle: string) {
    await test.step(`Close inline success dialog with title: '${expectedTitle}'`, async () => {
      console.log(
        `Closing inline success dialog with expected title: '${expectedTitle}'`,
      );
      const iframe = await this.waitForExamplesIFrame();
      await this.verifyTitleAndCloseDialog(expectedTitle);
    });
  }
  async generateAndValidateForPaths(
    endpoints: { path: string; responseCodes: number[] }[],
  ) {
    let isFirstIteration = true;
    for (const endpoint of endpoints) {
      for (const code of endpoint.responseCodes) {
        const withVisualValidation = isFirstIteration;
        isFirstIteration = false;
        await test.step(`Generate example and validate for path: '/${endpoint.path}' and response code: '${code}'`, async () => {
          console.log(
            `Generating and validating example for path: '/${endpoint.path}' and response code: '${code}'`,
          );
          await this.generateExample(endpoint.path, code, withVisualValidation);
          await this.verifyGeneratedExample(
            endpoint.path,
            code,
            withVisualValidation,
          );
          await this.viewExampleDetailsAndReturn(
            endpoint.path,
            code,
            withVisualValidation,
          );
          await this.validateExample(endpoint.path, code, withVisualValidation);
        });
      }
    }
  }

  async generateExampleAndViewDetailsForPath(path: string, code: number) {
    await test.step(`Generate example and view details for path: '/${path}' and response code: '${code}'`, async () => {
      console.log(
        `Generating example and viewing details for path: '/${path}' and response code: '${code}'`,
      );
      await this.generateExample(path, code);
      await this.clickViewDetails(path, code);
    });
  }

  async closeInvalidExampleDialog(dialogTitle: string) {
    await test.step(`Close invalid example dialog with title: '${dialogTitle}'`, async () => {
      console.log(
        `Closing invalid example dialog with title: '${dialogTitle}'`,
      );
      await this.verifyTitleAndCloseDialog(`${dialogTitle}`);
    });
  }

  async closeExamplesGenerationCompletedDialog(dialogTitle: string) {
    await test.step(`Close examples generated dialog with title: '${dialogTitle}'`, async () => {
      console.log(
        `Closing examples generated dialog with title: '${dialogTitle}'`,
      );
      await this.verifyTitleAndCloseDialog(`${dialogTitle}`);
    });
  }

  async closeFixedExampleDialog(dialogTitle: string) {
    await test.step(`Close fixed example dialog with title: '${dialogTitle}'`, async () => {
      console.log(`Closing fixed example dialog with title: '${dialogTitle}'`);
      await this.verifyTitleAndCloseDialog(`${dialogTitle}`);
    });
  }

  async closeValidExampleDialog(dialogTitle: string) {
    await test.step(`Close valid example dialog with title: '${dialogTitle}'`, async () => {
      console.log(`Closing valid example dialog with title: '${dialogTitle}'`);
      await this.verifyTitleAndCloseDialog(`${dialogTitle}`);
    });
  }

  async fixExampleWithAutoFix() {
    await test.step(`Fix example with Auto-Fix`, async () => {
      console.log(`Fixing example with Auto-Fix`);
      const iframe = await this.waitForExamplesIFrame();
      const autoFixBtn = iframe.locator(this.bulkFixBtnSelector);

      await autoFixBtn.waitFor({ state: "attached", timeout: 4000 });

      const isVisible = await autoFixBtn.isVisible();
      const isEnabled = await autoFixBtn.isEnabled();

      if (!isVisible || !isEnabled) {
        console.warn(
          "Auto-Fix button is not enabled/visible, skipping auto-fix step.",
        );
        return;
      }

      await autoFixBtn.click();
      await takeAndAttachScreenshot(this.page, `clicked-auto-fix`, this.eyes);
      await this.verifyTitleAndCloseDialog("Fixed Example");
    });
  }

  async getDetailsOfErrorsInExample(): Promise<[number, string]> {
    return await test.step(`Get details of errors in example`, async () => {
      console.log(`Getting details of errors in example`);
      const iframe = await this.waitForExamplesIFrame();
      // Click the details div to expand if not already expanded
      const detailsDiv = iframe.locator("div.details");
      const classAttr = await detailsDiv.getAttribute("class");
      if (!classAttr || !classAttr.includes("expanded")) {
        await detailsDiv.click();
        await expect(detailsDiv).toHaveClass(/expanded/, { timeout: 3000 });
      }
      const expandedDiv = iframe.locator("div.details.expanded");
      await expect(expandedDiv).toBeVisible({ timeout: 5000 });
      // The summary line is in the .dropdown > p
      const summaryP = expandedDiv.locator(".dropdown > p");
      const summaryText = await summaryP.textContent();

      let errorCount = 0;
      if (summaryText) {
        const match = summaryText.match(/Example has (\d+) Error/);
        if (match) {
          errorCount = parseInt(match[1], 10);
        }
      }
      // The error message blob is in the <pre> tag
      const pre = expandedDiv.locator("pre");
      let errorBlob = "";
      if ((await pre.count()) > 0) {
        errorBlob = (await pre.first().textContent()) || "";
      }
      return [errorCount, errorBlob];
    });
  }

  async getCollapsedErrorSummaryCount(): Promise<number> {
    return await test.step(`Get collapsed error summary count`, async () => {
      console.log(`Getting collapsed error summary count`);
      const iframe = await this.waitForExamplesIFrame();
      const detailsDiv = iframe.locator("div.details");
      await expect(detailsDiv).toBeVisible({ timeout: 5000 });

      const classAttr = await detailsDiv.getAttribute("class");
      if (classAttr?.includes("expanded")) {
        console.log(`\tDetails div is already expanded — collapsing it first`);
        await detailsDiv.click();
        await expect(detailsDiv).not.toHaveClass(/expanded/, { timeout: 3000 });
      }

      const summaryP = detailsDiv.locator(".dropdown > p");
      const summaryText = await summaryP.textContent();
      console.log(`\tCollapsed summary text: "${summaryText}"`);

      let errorCount = 0;
      if (summaryText) {
        const match = summaryText.match(/Example has (\d+) Error/);
        if (match) {
          errorCount = parseInt(match[1], 10);
        }
      }
      await takeAndAttachScreenshot(
        this.page,
        `collapsed-error-summary-count-${errorCount}`,
      );
      return errorCount;
    });
  }

  async getVisibleErrorBlockCount(): Promise<number> {
    return await test.step(`Get visible error block count after expanding`, async () => {
      console.log(`Getting visible error block count in expanded details`);
      const iframe = await this.waitForExamplesIFrame();
      const detailsDiv = iframe.locator("div.details");

      const classAttr = await detailsDiv.getAttribute("class");
      if (!classAttr?.includes("expanded")) {
        await detailsDiv.click();
        await expect(detailsDiv).toHaveClass(/expanded/, { timeout: 3000 });
      }

      const expandedDiv = iframe.locator("div.details.expanded");
      await expect(expandedDiv).toBeVisible({ timeout: 5000 });

      const pre = expandedDiv.locator("pre");
      let preText = "";
      if ((await pre.count()) > 0) {
        preText = (await pre.first().textContent()) || "";
      }

      const errorBlocks = preText
        .split("\n")
        .filter((line) => line.trim().startsWith(">>"));
      const count = errorBlocks.length;

      console.log(`\tVisible error block count: ${count}`);
      await takeAndAttachScreenshot(
        this.page,
        `expanded-error-block-count-${count}`,
      );
      return count;
    });
  }

  async saveEditedExample(expectedDialogTitle: string) {
    await test.step(`Save edited example`, async () => {
      console.log(`Saving edited example`);
      await this.saveAndValidate();
      await this.verifyTitleAndCloseDialog(expectedDialogTitle);
    });
  }

  async editExample(edits: Edit[]) {
    await test.step(`Edit and save example with edits`, async () => {
      console.log(`Editing example`);
      const frame = await this.waitForExamplesIFrame();

      const lines = frame.locator("#example-pre .cm-line");

      await expect(lines.first()).toBeVisible({ timeout: 15000 });

      // create a for loop to process each edit one by one
      for (const edit of edits) {
        let target = lines;

        const pattern = edit.current;

        console.log(
          `\tProcessing edit #${edits.indexOf(edit) + 1}: '${JSON.stringify(edit.current)}' to '${edit.changeTo}' with pattern mode: '${pattern.mode}'`,
        );

        if (pattern.mode === "exact") {
          target = target.filter({ hasText: pattern.value });
        } else if (pattern.mode === "keyOnly") {
          const re = new RegExp(`"${pattern.key}"`);
          target = target.filter({ hasText: re });
        } else if (pattern.mode === "keyAndAnyNumber") {
          const re = new RegExp(`"${pattern.key}"\\s*:\\s*\\d+`);
          target = target.filter({ hasText: re });
        }

        const line = target.first();
        console.log(`\tLocated line for edit #${edits.indexOf(edit) + 1}`);
        console.log(`\tOriginal line text: '${await line.innerText()}'`);

        await expect(line).toBeVisible({ timeout: 10000 });

        await line.scrollIntoViewIfNeeded();
        await line.click();

        // In CodeMirror, Home lands at first non-whitespace for indented lines.
        // Replacing from there keeps existing indentation unchanged.
        await this.page.keyboard.press("Home");
        await this.page.keyboard.press("Shift+End");

        await this.page.keyboard.type(edit.changeTo);

        takeAndAttachScreenshot(
          this.page,
          `edited-example-line-${edits.indexOf(edit) + 1}`,
        );

        console.log(
          `\tEdited example line: '${JSON.stringify(edit.current)}' to '${edit.changeTo}'`,
        );
      }
      console.log(`All edits processed`);
    });
  }

  private async generateExample(
    path: string,
    code: number,
    withVisualValidation = true,
  ) {
    await test.step(`Generate example`, async () => {
      console.log(
        `\tGenerating example for path: '/${path}' and response code: '${code}'`,
      );
      await this.clickGenerateButton(path, code, withVisualValidation);
    });
  }

  private async validateExample(
    path: string,
    code: number,
    withVisualValidation = true,
  ) {
    await test.step(`Validate generated example`, async () => {
      console.log(
        `\tValidating example for path: '/${path}' and response code: '${code}'`,
      );
      await this.clickValidateButton(path, code, withVisualValidation);
    });
  }

  private async viewExampleDetailsAndReturn(
    path: string,
    code: number,
    withVisualValidation = true,
  ) {
    await test.step(`View details and go back`, async () => {
      console.log(
        `\tViewing details for example of path: '/${path}' and response code: '${code}'`,
      );
      await this.clickViewDetails(path, code, withVisualValidation);
      await this.saveAndValidate(withVisualValidation);
      await this.verifyTitleAndCloseDialog("Valid Example");
      await this.clickGoBack(path, code);
    });
  }

  private async verifyGeneratedExample(
    path: string,
    code: number,
    withVisualValidation = true,
  ) {
    await test.step(`Verify example is generated`, async () => {
      console.log(
        `\tVerifying generated example for path: '/${path}' and response code: '${code}'`,
      );
      await this.verifyGenerateButtonNotVisible(path, code);
      await this.verifyExampleFileNameVisible(path, code, withVisualValidation);
      await this.verifyValidateButtonVisible(path, code, withVisualValidation);
    });
  }

  async openExampleGenerationTabForSpec(
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
      await this.openExampleGenerationTab();
    });
  }

  async openExampleGenerationTabFromTab(): Promise<void> {
    await test.step("Open Example Generation tab (no page reload)", async () => {
      const examplesTabLi = this.page
        .locator('li.tab[data-type="example"]')
        .first();
      await examplesTabLi.waitFor({ state: "visible", timeout: 10000 });
      const isActive =
        (await examplesTabLi.getAttribute("data-active")) === "true";
      if (!isActive) {
        await examplesTabLi.click({ force: true, timeout: 10000 });
        await this.page.waitForTimeout(500);
      }
      await this.waitForExamplesIFrame();
      await takeAndAttachScreenshot(this.page, "example-tab-opened");
    });
  }

  async clickGenerateMoreButton(path: string, responseCode: number) {
    await test.step(`Click Generate More for ${path} - ${responseCode}`, async () => {
      const iframe = await this.waitForExamplesIFrame();
      const generateMoreBtn = iframe.locator(
        `//tr[@data-raw-path="/${path}" and .//td[@class='response-cell']/p[text()="${responseCode}"]]//button[@aria-label="Generate More"]`,
      );
      await expect(generateMoreBtn).toBeVisible({ timeout: 4000 });
      await generateMoreBtn.click();
      await this.page.waitForTimeout(1000);
      await this.verifyTitleAndCloseDialog("Example Generated");
    });
  }

  async getGeneratedExampleNames(): Promise<string[]> {
    return await test.step(`Get generated example names`, async () => {
      console.log(`Getting generated example names from Examples tab`);
      const iframe = await this.waitForExamplesIFrame();
      const exampleRows = await iframe
        .locator("tr[data-example-relative-path]")
        .all();

      const examples: string[] = [];
      for (const row of exampleRows) {
        const nameSpan = row.locator('td:nth-child(6) > span').first();
        if (await nameSpan.count() > 0) {
           const name = await nameSpan.textContent();
           if (name) {
             examples.push(name.trim());
           }
        }
      }

      console.log(`Found ${examples.length} generated examples:`, examples);
      await takeAndAttachScreenshot(this.page, `generated-example-names`);
      return examples;
    });
  }

  async openSpecTabForCurrentSpec() {
    await test.step(`Open Spec tab for current spec`, async () => {
      console.log(`Opening Spec tab`);
      await this.openApiTabPage.openSpecTab(this.specTabLocator);
      await takeAndAttachScreenshot(this.page, `spec-tab-opened`);
    });
  }

  async verifyInlinedExamplesInSpec(
    expectedExamples: string[],
  ) {
    await test.step(`Verify inlined examples in spec file`, async () => {
      const specContent = this.readSpecFile();

      for (const name of expectedExamples) {
        if (!specContent.includes(name)) {
          console.error(`\t FAILED: '${name}' not found in spec file`);
          await takeAndAttachScreenshot(this.page, `failed-to-find-${name}`);
          throw new Error(`Example '${name}' not found in spec file '${this.specName}'`);
        } else {
          console.log(`\t ✓ Verified: ${name} is inlined`);
        }
      }

      await takeAndAttachScreenshot(
        this.page,
        `verified-inlined-examples`,
      );

      if (expectedExamples.length > 0) {
        await this.showVisualEvidenceInEditor(
          expectedExamples
        );
      }
    });
  }

  private readSpecFile(): string {
    const fs = require("fs");
    const nodePath = require("path");
    const specFilePath = nodePath.join(
      process.cwd(),
      "specmatic-studio-demo",
      "specs",
      this.specName!,
    );
    return fs.readFileSync(specFilePath, "utf-8");
  }


  private async showVisualEvidenceInEditor(
    examples: string[],
  ) {
    await test.step(`Capture visual evidence in editor`, async () => {
      const editorContext = await this.getSpecEditorContext();
      await expect(editorContext.content).toBeVisible({ timeout: 15000 });
      await editorContext.content.click();

      await this.specEditorHelper.loadFullEditorDocument(
        editorContext.scroller,
      );
      await editorContext.scroller.evaluate((el) => {
        el.scrollTop = 0;
      });
      await this.page.waitForTimeout(250);

      for (const exampleName of examples) {
        const foundByEditorApi =
          await this.specEditorHelper.focusTermUsingCodeMirrorApi(
            editorContext.content,
            exampleName,
          );
        const foundByWindowFind = foundByEditorApi
          ? true
          : await this.findTermUsingWindowFind(editorContext.frame, exampleName);

        if (!foundByWindowFind) {
          await this.specEditorHelper.scrollEditorToFindTerm(
            editorContext.content,
            editorContext.scroller,
            editorContext.lines,
            exampleName,
          );

          const match = editorContext.lines
            .filter({ hasText: exampleName })
            .first();
          if ((await match.count()) > 0) {
            await match.scrollIntoViewIfNeeded();
            await match.click();
          }
        }

        await this.page.waitForTimeout(250);

        await takeAndAttachScreenshot(
          this.page,
          `visual-${exampleName}`,
        );
      }
    });
  }

  private async getSpecEditorContext(): Promise<{
    content: Locator;
    scroller: Locator;
    lines: Locator;
    frame?: Frame;
  }> {
    for (let attempt = 1; attempt <= 24; attempt++) {
      const specIframe = this.specEditorSection.locator("iframe").first();
      if ((await specIframe.count()) > 0) {
        const iframeElement = await specIframe.elementHandle();
        const frame = await iframeElement?.contentFrame();

        if (frame) {
          const content = frame.locator(".cm-content").first();
          if ((await content.count()) > 0) {
            const scroller = frame.locator(".cm-scroller").first();
            const lines = frame.locator(".cm-line");
            return { content, scroller, lines, frame };
          }
        }
      }

      const content = this.specEditorSection.locator(".cm-content").first();
      if ((await content.count()) > 0) {
        const scroller = this.specEditorSection.locator(".cm-scroller").first();
        const lines = this.specEditorSection.locator(".cm-line");
        return { content, scroller, lines };
      }

      if (attempt === 8 || attempt === 16) {
        await this.openSpecTabForCurrentSpec();
      }
      await this.page.waitForTimeout(500);
    }

    await takeAndAttachScreenshot(this.page, "spec-editor-not-found");
    throw new Error("Spec editor content was not found in visible spec tab");
  }

  async copyEditorContent(): Promise<void> {
    await test.step("Copy editor content to clipboard", async () => {
      const iframe = await this.waitForExamplesIFrame();
      const editor = iframe.locator("#example-pre .cm-content");
      await expect(editor).toBeVisible({ timeout: 5000 });
      await editor.click();
      await this.page.keyboard.press("ControlOrMeta+A");
      await this.page.keyboard.press("ControlOrMeta+C");
      await this.page.waitForTimeout(500);
      await takeAndAttachScreenshot(this.page, "editor-content-copied");
    });
  }

  async getEditorContent(): Promise<string> {
    return test.step("Read editor content", async () => {
      const iframe = await this.waitForExamplesIFrame();
      const editor = iframe.locator("#example-pre .cm-content");
      await expect(editor).toBeVisible({ timeout: 5000 });
      return await editor.evaluate((el) => {
        const cmEditor = el.closest(".cm-editor") as {
          cmView?: { view?: { state?: { doc?: { toString(): string } } } };
        } | null;
        const fullText = cmEditor?.cmView?.view?.state?.doc?.toString();
        if (fullText) return fullText;
        return el.textContent?.trim() ?? "";
      });
    });
  }

  async replaceEditorContent(content: string): Promise<void> {
    await test.step("Replace editor content", async () => {
      const iframe = await this.waitForExamplesIFrame();
      const editor = iframe.locator("#example-pre .cm-content");
      const editorScroller = iframe.locator("#example-pre .cm-scroller");
      await expect(editor).toBeVisible({ timeout: 5000 });
      await editor.click();
      await this.page.keyboard.press("ControlOrMeta+A");
      await this.page.keyboard.insertText(content);
      await this.page.waitForTimeout(500);
      await expect(editorScroller).toBeVisible({ timeout: 5000 });
      await editorScroller.evaluate((el) => {
        el.scrollTop = 0;
      });
      await this.page.waitForTimeout(300);
      await takeAndAttachScreenshot(this.page, "editor-content-replaced");
    });
  }

  async getCurrentExampleRelativeFilePath(): Promise<string> {
    return test.step("Read current example file path", async () => {
      const iframe = await this.waitForExamplesIFrame();
      const filePathLabel = iframe
        .locator("p")
        .filter({ hasText: "File path:" })
        .first();
      await expect(filePathLabel).toBeVisible({ timeout: 5000 });

      const rawText = (await filePathLabel.textContent())?.trim() ?? "";
      const relativePath = rawText.replace(/^File path:\s*/, "");
      if (!relativePath.startsWith("./")) {
        throw new Error(`Unexpected example file path: '${rawText}'`);
      }

      return relativePath;
    });
  }

  async pasteIntoEditor(): Promise<void> {
    await test.step("Paste content into editor", async () => {
      const iframe = await this.waitForExamplesIFrame();
      const editor = iframe.locator("#example-pre .cm-content");
      const editorScroller = iframe.locator("#example-pre .cm-scroller");
      await expect(editor).toBeVisible({ timeout: 5000 });
      await editor.click();
      await this.page.keyboard.press("ControlOrMeta+A");
      await this.page.keyboard.press("ControlOrMeta+V");
      await this.page.waitForTimeout(500);
      await expect(editorScroller).toBeVisible({ timeout: 5000 });
      await editorScroller.evaluate((el) => {
        el.scrollTop = 0;
      });
      await this.page.waitForTimeout(300);
      await takeAndAttachScreenshot(this.page, "editor-content-pasted");
    });
  }

  async goBackFromExample(): Promise<void> {
    await test.step("Go back to examples list", async () => {
      const iframe = await this.waitForExamplesIFrame();
      const goBackBtn = iframe.getByRole("button", {
        name: /Go Back|← Go Back/,
      });
      await expect(goBackBtn).toBeVisible({ timeout: 4000 });
      await goBackBtn.click();
      await this.page.waitForTimeout(1000);
      await takeAndAttachScreenshot(this.page, "went-back-to-examples-list");
    });
  }

  private async findTermUsingWindowFind(
    frame: Frame | undefined,
    searchTerm: string,
  ): Promise<boolean> {
    if (frame) {
      return await frame.evaluate((term) => {
        window.getSelection()?.removeAllRanges();
        const win = window as Window & { find?: (...args: any[]) => boolean };
        if (typeof win.find !== "function") {
          return false;
        }
        return win.find(term, false, false, true, false, false, false);
      }, searchTerm);
    }

    return await this.page.evaluate((term) => {
      window.getSelection()?.removeAllRanges();
      const win = window as Window & { find?: (...args: any[]) => boolean };
      if (typeof win.find !== "function") {
        return false;
      }
      return win.find(term, false, false, true, false, false, false);
    }, searchTerm);
  }
}
