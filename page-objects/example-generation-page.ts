import {
  Locator,
  Page,
  expect,
  test,
  type Frame,
  type TestInfo,
} from "@playwright/test";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";
import { Edit } from "../utils/types/json-edit.types";
import { BasePage } from "./base-page";
import { OpenAPISpecTabPage } from "./openapi-spec-tab-page";
import { SpecEditorPage } from "./spec-editor-page";

export class ExampleGenerationPage extends BasePage {
  readonly openApiTabPage: OpenAPISpecTabPage;
  protected readonly specTree: Locator;
  private readonly generateExamplesBtn: Locator;
  private readonly examplesRoot: Locator;
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
    this.examplesRoot = this.specSection.getByTestId("examples-root");
    this.openApiTabPage = new OpenAPISpecTabPage(this);
    this.specEditorHelper = new SpecEditorPage(page);
  }

  private async openExampleGenerationTab() {
    console.log("Opening Example Generation tab");
    return this.openApiTabPage.openExampleGenerationTab();
  }

  private getExamplesRoot(): Locator {
    return this.examplesRoot;
  }

  private getBulkAction(action: string): Locator {
    return this.getExamplesRoot().getByTestId(`examples-bulk-${action}`);
  }

  private getDetailAction(action: string): Locator {
    return this.getExamplesRoot().getByTestId(`examples-detail-${action}`);
  }

  private getAlert(): Locator {
    return this.getExamplesRoot().getByTestId("examples-alert");
  }

  private getRow(path: string, responseCode: number): Locator {
    const normalizedPath = this.normalizeExamplePath(path);
    return this.getExamplesRoot().locator(
      `[data-pwtestid="examples-row"][data-example-path="/${normalizedPath}"][data-example-response-code="${responseCode}"]`,
    );
  }

  private getGeneratedRow(path: string, responseCode: number): Locator {
    return this.getRow(path, responseCode).filter({
      has: this.getExamplesRoot().getByTestId("examples-row-example-name"),
    });
  }

  private getEditor(): Locator {
    return this.getExamplesRoot()
      .getByTestId("examples-editor")
      .locator(".cm-content");
  }

  private getEditorScroller(): Locator {
    return this.getExamplesRoot()
      .getByTestId("examples-editor")
      .locator(".cm-scroller");
  }

  private normalizeDialogTitle(title: string): string {
    const normalizedTitle = title.trim().toLowerCase();
    if (/^\d+\s+example\(s\)\s+generated$/.test(normalizedTitle)) {
      return "Example Generated";
    }

    const legacyTitles: Record<string, string> = {
      "example generations complete": "Example Generations Complete",
      "example validations complete": "Example Validations Complete",
      "examples inline complete": "Examples Inline Complete",
      "delete examples complete": "Delete Examples Complete",
      "valid example": "Valid Example",
      "valid examples": "Valid Examples",
      "invalid example": "Invalid Example",
      "invalid examples": "Invalid Examples",
      "fixed example": "Fixed Example",
      "converted to partial": "Converted Example To Partial",
      "example generated": "Example Generated",
      "examples valid": "Example Validations Complete",
      "examples deleted": "Delete Examples Complete",
    };

    return legacyTitles[normalizedTitle] ?? title;
  }

  private normalizeExamplePath(path: string): string {
    const trimmedPath = path.replace(/^\//, "");
    return trimmedPath.replace(/\(([^:()]+):[^)]+\)/g, "{$1}");
  }

  private normalizeDialogMessage(message: string): string {
    const trimmedMessage = message.trim();
    const generatedMatch = trimmedMessage.match(/^(\d+)\s+new example\(s\) generated$/i);
    if (generatedMatch) {
      return `${generatedMatch[1]} new examples`;
    }

    const validMatch = trimmedMessage.match(/^All\s+(\d+)\s+example\(s\)\s+are valid$/i);
    if (validMatch) {
      return `All ${validMatch[1]} examples are valid`;
    }

    return trimmedMessage;
  }

  private async clickGenerateButton(
    endpoint: string,
    responseCode: number,
    withVisualValidation = true,
  ) {
    const root = await this.waitForExamplesRoot();
    const row = this.getRow(endpoint, responseCode);
    const generateBtn = row.getByTestId("examples-row-generate");
    const generateMoreBtn = row.getByTestId("examples-row-generate-more");
    const count = (await generateBtn.count()) + (await generateMoreBtn.count());
    if (count === 0) {
      await this.printDebugInfoForAvailableEndpoints(root, endpoint, responseCode);
      throw new Error(
        `No generate button found for endpoint: ${endpoint}, responseCode: ${responseCode}`,
      );
    }
    const btn =
      (await generateBtn.count()) > 0 ? generateBtn.first() : generateMoreBtn.first();
    await expect(btn).toBeVisible({ timeout: 4000 });
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    await expect(this.getAlert()).toBeVisible({ timeout: 5000 });
    await takeAndAttachScreenshot(
      this.page,
      `clicked-generate-${endpoint}-${responseCode}`,
      withVisualValidation ? this.eyes : undefined,
    );
    await this.verifyTitleAndCloseDialog("Example Generated");
  }

  private async printDebugInfoForAvailableEndpoints(
    root: Locator,
    endpoint: string,
    responseCode: number,
  ) {
    const allRows = await root.locator('[data-pwtestid="examples-row"]').all();
    const debugRows = [];
    for (const row of allRows) {
      const rawPath = await row.getAttribute("data-example-path");
      const responseCells = await row
        .getByTestId("examples-row-response-code")
        .all();
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
    const rowLocator = this.getRow(endpoint, responseCode);
    const generateBtn = rowLocator.getByTestId("examples-row-generate");
    await expect(generateBtn).toBeHidden({ timeout: 4000 });
  }

  private async verifyExampleFileNameVisible(
    endpoint: string,
    responseCode: number,
    withVisualValidation = true,
  ) {
    const fileNameSpan = this.getRow(endpoint, responseCode).getByTestId(
      "examples-row-example-name",
    );
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
    await takeAndAttachScreenshot(
      this.page,
      `validate-button-visible-${endpoint}-${responseCode}`,
      withVisualValidation ? this.eyes : undefined,
    );
    const validateBtn = this.getRow(endpoint, responseCode).getByTestId(
      "examples-row-validate",
    );
    await expect(validateBtn).toBeVisible({ timeout: 4000 });
  }

  async clickViewDetails(
    endpoint: string,
    responseCode: number,
    withVisualValidation = true,
    targetNewlyGenerated = false,
  ) {
    let viewDetailsSpan: Locator;

    if (targetNewlyGenerated) {
      const row = this.getExamplesRoot().locator(
        `[data-pwtestid="examples-row"][data-example-path="/${endpoint}"][data-example-file$="_2.json"]`,
      );
      await expect(row).toBeAttached({ timeout: 5000 });
      viewDetailsSpan = row.getByTestId("examples-row-view-details");
    } else {
      viewDetailsSpan = this.getRow(endpoint, responseCode).getByTestId(
        "examples-row-view-details",
      );
      await expect(viewDetailsSpan).toBeVisible({ timeout: 4000 });
    }

    await viewDetailsSpan.click({ force: true });

    // Wait for the details view/editor to fully load in the iframe
    await this.waitForDetailsViewToLoad();
    await this.page.waitForTimeout(1000);

    await takeAndAttachScreenshot(
      this.page,
      `view-details-${endpoint}-${responseCode}`,
      withVisualValidation ? this.eyes : undefined,
    );
  }

  private async clickGoBack(endpoint: string, responseCode: number) {
    const root = await this.waitForExamplesRoot();
    const goBackBtn = root.getByTestId("examples-back");
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
    await this.waitForExamplesRoot();
    const validateBtn = this.getRow(endpoint, responseCode).getByTestId(
      "examples-row-validate",
    );
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

    const alert = this.getAlert();
    await expect(alert).toBeAttached({ timeout: 15000 });

    const title = await this.getDialogTitle(alert);
    const message = await this.getDialogMessage(alert);
    expect.soft(title).toContain(expectedTitle);

    await alert.getByTestId("examples-alert-close").click();
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

  private async getDialogTitle(alert: Locator): Promise<string> {
    const dialogTitle = await alert
      .getByTestId("examples-alert-title")
      .innerText();
    const normalizedTitle = this.normalizeDialogTitle(dialogTitle);
    console.log("\t\tActual dialog title:", dialogTitle);
    return normalizedTitle;
  }

  private async getDialogMessage(alert: Locator): Promise<string> {
    const message = alert.getByTestId("examples-alert-message");
    const dialogMessage = this.normalizeDialogMessage(
      (await message.textContent().catch(() => ""))?.trim() || "",
    );
    console.log("\t\tActual dialog message:", dialogMessage);
    return dialogMessage;
  }

  private async saveAndValidate(withVisualValidation = true) {
    await test.step(`Click 'Save & Validate' button`, async () => {
      const root = await this.waitForExamplesRoot();
      const saveValidateBtn = root.getByTestId("examples-detail-validate");
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
      const root = await this.waitForExamplesRoot();
      await this.selectAll(root);

      const bulkDeleteBtn = this.getBulkAction("delete");
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
        await this.uncheckSelectAll(root);
      }

      await takeAndAttachScreenshot(
        this.page,
        `examples-deleted-or-none-to-delete`,
      );
    });
  }

  async deleteGeneratedExampleForPath(path: string, responseCode: number) {
    await test.step(
      `Delete generated example for /${path} ${responseCode}`,
      async () => {
        const root = await this.waitForExamplesRoot();
        const generatedRow = this.getGeneratedRow(path, responseCode);
        await expect(generatedRow.first()).toBeVisible({ timeout: 5000 });

        const generatedFilePath =
          await generatedRow.first().getAttribute("data-example-file");
        const rowCheckbox = generatedRow
          .first()
          .getByTestId("examples-row-checkbox");
        await expect(rowCheckbox).toBeVisible({ timeout: 3000 });
        await rowCheckbox.check({ force: true });

        await takeAndAttachScreenshot(
          this.page,
          `selected-generated-example-${path}-${responseCode}`,
        );

        const bulkDeleteBtn = this.getBulkAction("delete");
        await expect(bulkDeleteBtn).toBeVisible({ timeout: 3000 });
        await bulkDeleteBtn.click();
        await this.verifyTitleAndCloseDialog("Delete Examples Complete");

        if (generatedFilePath) {
          await expect(
            root.locator(`[data-example-file="${generatedFilePath}"]`),
          ).toHaveCount(0, { timeout: 5000 });
        }

        await takeAndAttachScreenshot(
          this.page,
          `deleted-generated-example-${path}-${responseCode}`,
        );
      },
    );
  }

  private async selectAll(root: Locator) {
    const selectAll = root.getByTestId("examples-select-all");
    const isVisible = await selectAll
      .waitFor({ state: "visible", timeout: 3000 })
      .then(() => true)
      .catch(() => false);
    if (!isVisible) {
      console.log("\tselect-all checkbox is not visible");
      return;
    }
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
        "selectAll: No checkboxes found for selector 'examples-select-all'",
      );
    }
    await takeAndAttachScreenshot(this.page, `select-all-checked`);
  }

  private async uncheckSelectAll(root: Locator) {
    const selectAll = root.getByTestId("examples-select-all");
    const isVisible = await selectAll
      .waitFor({ state: "visible", timeout: 3000 })
      .then(() => true)
      .catch(() => false);
    if (!isVisible) {
      return;
    }
    console.log("\tuncheck select-all checkbox found");
    if (await selectAll.isChecked()) {
      await selectAll.click({ force: true });
      await expect(selectAll).not.toBeChecked({ timeout: 2000 });
      console.log("\tselect-all checkbox unchecked");
      await takeAndAttachScreenshot(this.page, `select-all-unchecked`);
    }
  }

  async waitForExamplesRoot() {
    const root = this.getExamplesRoot();
    await root.waitFor({ state: "visible", timeout: 10000 });
    console.log("\tSuccessfully located the examples root");
    return root;
  }

  async validateAllExamples() {
    await test.step(`Validate all generated examples`, async () => {
      console.log(`Validating all generated examples`);
      const root = await this.waitForExamplesRoot();
      await this.selectAll(root);
      await this.clickBulkValidateButton();

      await this.waitForProcessingToComplete(this.getBulkAction("validate"));
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
      const root = await this.waitForExamplesRoot();
      await this.selectAll(root);
      await this.clickBulkGenerateButton();

      await this.waitForProcessingToComplete(this.getBulkAction("generate"));
      await takeAndAttachScreenshot(
        this.page,
        `generate-examples-for-all-paths`,
        this.eyes,
      );
    });
  }

  private async waitForProcessingToComplete(button: Locator) {
    console.log(`\t\tWaiting for processing to complete...`);
    await button
      .waitFor({ state: "visible", timeout: 5000 })
      .catch(() => {
        console.log(
          "\t\tProcessing button did not appear within 5 seconds, proceeding to check for generation completion",
        );
      });
    await expect
      .poll(
        async () => (await button.getAttribute("data-processing")) === "true",
        { timeout: 5000 },
      )
      .toBeTruthy()
      .catch(() => {});
    await expect(button).toHaveAttribute("data-processing", "false", {
      timeout: 60000,
    });
  }

  async getNumberOfPathMethodsAndResponses(): Promise<number> {
    const root = await this.waitForExamplesRoot();
    const exampleRows = await root.locator('[data-pwtestid="examples-row"]').all();
    console.log(
      `\tTotal number of path-method-response combinations: ${exampleRows.length}`,
    );
    return exampleRows.length;
  }

  async getNumberOfGenerateButtons(): Promise<number> {
    const root = await this.waitForExamplesRoot();
    const generateButtons = await root
      .locator('[data-pwtestid="examples-row-generate"]')
      .all();
    console.log(
      `\tNumber of Generate buttons available: ${generateButtons.length}`,
    );
    return generateButtons.length;
  }

  async getNumberOfValidateButtons(): Promise<number> {
    const root = await this.waitForExamplesRoot();
    const validateButtons = await root
      .locator('[data-pwtestid="examples-row-validate"]')
      .all();
    console.log(
      `\tNumber of Validate buttons available: ${validateButtons.length}`,
    );
    return validateButtons.length;
  }

  async getNumberOfExamplesValidated(): Promise<number> {
    const root = await this.waitForExamplesRoot();
    const exampleRows = await root.locator('tr[data-valid="success"]').all();
    console.log(
      `\tTotal endpoints with generated examples: ${exampleRows.length}`,
    );
    return exampleRows.length;
  }

  async getNumberOfExamplesGenerated(): Promise<number> {
    const root = await this.waitForExamplesRoot();
    const exampleRows = await root
      .locator('tr[data-example-generated="true"]')
      .all();
    console.log(
      `\tTotal endpoints with generated examples: ${exampleRows.length}`,
    );
    return exampleRows.length;
  }

  private async clickBulkGenerateButton() {
    const bulkGenerateBtn = this.getBulkAction("generate");
    await bulkGenerateBtn.waitFor({ state: "visible", timeout: 4000 });
    await expect(bulkGenerateBtn).toBeVisible({ timeout: 4000 });
    await expect(bulkGenerateBtn).toBeEnabled({ timeout: 4000 });
    await bulkGenerateBtn.click();
    await takeAndAttachScreenshot(this.page, "clicked-generate");
  }
  private async clickBulkValidateButton() {
    const bulkValidateBtn = this.getBulkAction("validate");
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
      const inlineBtn = this.getBulkAction("inline");
      await inlineBtn.waitFor({ state: "visible", timeout: 4000 });
      await expect(inlineBtn).toBeVisible({ timeout: 4000 });
      await expect(inlineBtn).toBeEnabled({ timeout: 4000 });
      await inlineBtn.click();
      await this.waitForInlineToComplete(inlineBtn);
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
      const alert = this.getAlert();
      await expect(alert).toBeVisible({ timeout: 10000 });
      await takeAndAttachScreenshot(this.page, `dialog-title-and-message`);
      const title = await this.getDialogTitle(alert);
      const message = await this.getDialogMessage(alert);
      return [title, message];
    });
  }

  async getDialogTitleAndMessageIfPresent(
    timeout = 5000,
  ): Promise<[string, string] | null> {
    return await test.step(`Get dialog title and message if present`, async () => {
      console.log(`\tGetting dialog title and message if present`);
      const alert = this.getAlert();
      const dialogContent = alert.getByTestId("examples-alert-title");
      const isDialogVisible = await dialogContent
        .waitFor({ state: "visible", timeout })
        .then(() => true)
        .catch(() => false);

      if (!isDialogVisible) {
        console.warn(
          `\tDialog content did not appear within ${timeout}ms, continuing without blocking the test`,
        );
        await takeAndAttachScreenshot(this.page, `dialog-not-visible`);
        return null;
      }

      await takeAndAttachScreenshot(this.page, `dialog-title-and-message`);
      const title = await this.getDialogTitle(alert);
      const message = await this.getDialogMessage(alert);

      const closeButton = alert.getByTestId("examples-alert-close").first();
      if (await closeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await closeButton.click();
        await this.page.waitForTimeout(1000);
        await expect(alert).toBeHidden({ timeout: 5000 });
      }

      return [title, message];
    });
  }

  private async waitForInlineToComplete(inlineBtn: Locator) {
    console.log(`\t\tWaiting for inline operation to complete...`);
    await expect
      .poll(
        async () => (await inlineBtn.getAttribute("data-processing")) === "true",
        { timeout: 5000 },
      )
      .toBeTruthy()
      .catch(() => {
        console.log(
          "\t\tInline button did not switch to 'Processing' within 5 seconds, checking whether the action already completed",
        );
      });

    await expect(inlineBtn).toHaveAttribute("data-processing", "false", {
      timeout: 60000,
    });
    await expect(inlineBtn).toBeEnabled({ timeout: 10000 });
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

  async convertCurrentExampleToPartialAndAssert(exampleName: string) {
    await test.step(
      `Convert current example to partial and verify dialog for '${exampleName}'`,
      async () => {
        const root = await this.waitForExamplesRoot();
        const convertToPartialButton = root.getByTestId(
          "examples-detail-convert-to-partial",
        );
        await expect(convertToPartialButton).toBeVisible({ timeout: 5000 });
        await convertToPartialButton.click();

        await takeAndAttachScreenshot(
          this.page,
          "converted-example-to-partial",
          this.eyes,
        );

        const alert = this.getAlert();
        await expect(alert).toBeVisible({ timeout: 5000 });

        const title = (await this.getDialogTitle(alert)).trim();
        const message = (await this.getDialogMessage(alert)).trim();
        expect(title).toBe("Converted Example To Partial");
        expect(message).toBe(`Example name: ${exampleName}`);

        const closeButton = alert.getByTestId("examples-alert-close");
        await closeButton.click();
        await expect(alert).toBeHidden({ timeout: 5000 });
      },
    );
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
      const autoFixBtn = this.getDetailAction("fix");

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
      const root = await this.waitForExamplesRoot();
      const detailsDiv = root.getByTestId("examples-issues");
      const classAttr = await detailsDiv.getAttribute("class");
      if (!classAttr || !classAttr.includes("expanded")) {
        await detailsDiv.click();
        await expect(detailsDiv).toHaveClass(/expanded/, { timeout: 3000 });
      }
      const expandedDiv = root.locator(
        '[data-pwtestid="examples-issues"].expanded',
      );
      await expect(expandedDiv).toBeVisible({ timeout: 5000 });
      const summaryP = expandedDiv
        .getByTestId("examples-issues-summary")
        .locator("p");
      const summaryText = await summaryP.textContent();

      let errorCount = 0;
      if (summaryText) {
        const match = summaryText.match(/Example has (\d+) Error/);
        if (match) {
          errorCount = parseInt(match[1], 10);
        }
      }
      // The error message blob is in the <pre> tag
      const pre = expandedDiv.getByTestId("examples-issues-content");
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
      const root = await this.waitForExamplesRoot();
      const detailsDiv = root.getByTestId("examples-issues");
      await expect(detailsDiv).toBeVisible({ timeout: 5000 });

      const classAttr = await detailsDiv.getAttribute("class");
      if (classAttr?.includes("expanded")) {
        console.log(`\tDetails div is already expanded — collapsing it first`);
        await detailsDiv.click();
        await expect(detailsDiv).not.toHaveClass(/expanded/, { timeout: 3000 });
      }

      const summaryP = detailsDiv
        .getByTestId("examples-issues-summary")
        .locator("p");
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
      const root = await this.waitForExamplesRoot();
      const detailsDiv = root.getByTestId("examples-issues");

      const classAttr = await detailsDiv.getAttribute("class");
      if (!classAttr?.includes("expanded")) {
        await detailsDiv.click();
        await expect(detailsDiv).toHaveClass(/expanded/, { timeout: 3000 });
      }

      const expandedDiv = root.locator(
        '[data-pwtestid="examples-issues"].expanded',
      );
      await expect(expandedDiv).toBeVisible({ timeout: 5000 });

      const pre = expandedDiv.getByTestId("examples-issues-content");
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
      // Wait for editor to be stable before saving
      await this.page.waitForTimeout(500);
      await this.saveAndValidate();
      await this.verifyTitleAndCloseDialog(expectedDialogTitle);
    });
  }

  async editExample(edits: Edit[]) {
    await test.step(`Edit and save example with edits`, async () => {
      console.log(`Editing example`);
      await this.waitForExamplesRoot();
      const lines = this.getExamplesRoot()
        .getByTestId("examples-editor")
        .locator(".cm-line");

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
      await this.waitForExamplesRoot();
      await takeAndAttachScreenshot(this.page, "example-tab-opened");
    });
  }

  async clickGenerateMoreButton(path: string, responseCode: number) {
    await test.step(`Click Generate More for ${path} - ${responseCode}`, async () => {
      await this.waitForExamplesRoot();
      const generateMoreBtn = this.getRow(path, responseCode).locator(
        '[data-pwtestid="examples-row-generate-more"]',
      );
      await expect(generateMoreBtn).toBeVisible({ timeout: 4000 });
      await generateMoreBtn.click();
      await this.page.waitForTimeout(1000);
      await this.verifyTitleAndCloseDialog("Example Generated");
      await takeAndAttachScreenshot(
        this.page,
        `clicked-generate-more-${responseCode}`,
        this.eyes,
      );
    });
  }

  async getExampleFilesForEndpoint(rawPath: string): Promise<string[]> {
    const root = await this.waitForExamplesRoot();
    const rows = root.locator(
      `[data-pwtestid="examples-row"][data-example-path="/${rawPath}"]`,
    );
    const count = await rows.count();
    const filePaths: string[] = [];

    for (let i = 0; i < count; i++) {
      const filePath = await rows.nth(i).getAttribute("data-example-file");
      if (filePath) filePaths.push(filePath);
    }
    return filePaths;
  }

  async getGeneratedExampleNames(): Promise<string[]> {
    return await test.step(`Get generated example names`, async () => {
      console.log(`Getting generated example names from Examples tab`);
      const root = await this.waitForExamplesRoot();
      const exampleRows = await root
        .locator(
          '[data-pwtestid="examples-row"][data-example-generated="true"]',
        )
        .all();

      const examples: string[] = [];
      for (const row of exampleRows) {
        const exampleCell = row.locator(
          '[data-pwtestid="examples-row-example-name"]',
        );

        let extractedName = "";
        if ((await exampleCell.count()) > 0) {
          extractedName = ((await exampleCell.innerText()) ?? "").trim();
        }

        if (!extractedName) {
          const relativePath = (await row.getAttribute("data-example-file")) ?? "";
          const fileName = relativePath.split("/").pop() ?? "";
          extractedName = fileName.replace(/\.json$/i, "").trim();
        }

        if (extractedName) {
          examples.push(extractedName);
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

  async verifyInlinedExamplesInSpec(expectedExamples: string[]) {
    await test.step(`Verify inlined examples in spec file`, async () => {
      const specContent = this.readSpecFile();

      for (const name of expectedExamples) {
        if (!specContent.includes(name)) {
          console.error(`\t FAILED: '${name}' not found in spec file`);
          await takeAndAttachScreenshot(this.page, `failed-to-find-${name}`);
          throw new Error(
            `Example '${name}' not found in spec file '${this.specName}'`,
          );
        } else {
          console.log(`\t ✓ Verified: ${name} is inlined`);
        }
      }

      await takeAndAttachScreenshot(this.page, `verified-inlined-examples`);

      if (expectedExamples.length > 0) {
        await this.showVisualEvidenceInEditor(expectedExamples);
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

  private async showVisualEvidenceInEditor(examples: string[]) {
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
          : await this.findTermUsingWindowFind(
              editorContext.frame,
              exampleName,
            );

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

        await takeAndAttachScreenshot(this.page, `visual-${exampleName}`);
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
      const editor = this.getEditor();
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
      const editor = this.getEditor();
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

  async captureCurrentExampleView(
    screenshotName: string,
    withVisualValidation = true,
  ): Promise<void> {
    await test.step(`Capture current example view: '${screenshotName}'`, async () => {
      const editor = this.getEditor();
      await expect(editor).toBeVisible({ timeout: 5000 });
      await editor.click();
      await this.page.waitForTimeout(250);
      await takeAndAttachScreenshot(
        this.page,
        screenshotName,
        withVisualValidation ? this.eyes : undefined,
      );
    });
  }

  async replaceEditorContent(content: string): Promise<void> {
    await test.step("Replace editor content", async () => {
      const editor = this.getEditor();
      const editorScroller = this.getEditorScroller();
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
      const filePathLabel = this.getExamplesRoot().getByTestId(
        "examples-current-file-path",
      );
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
      const editor = this.getEditor();
      const editorScroller = this.getEditorScroller();
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
      const goBackBtn = this.getExamplesRoot().getByTestId("examples-back");
      await expect(goBackBtn).toBeVisible({ timeout: 4000 });
      await goBackBtn.click();

      // Wait for the examples list to fully load
      await this.waitForExamplesListToLoad();
      await this.page.waitForTimeout(500);

      await takeAndAttachScreenshot(this.page, "went-back-to-examples-list");
    });
  }

  private async waitForDetailsViewToLoad(): Promise<void> {
    const root = await this.waitForExamplesRoot();

    // Wait for editor content or viewer content to be visible
    // This could be CodeMirror editor (.cm-content), or other viewer elements
    await Promise.race([
      root.getByTestId("examples-editor").locator(".cm-content").first().waitFor({
        state: "visible",
        timeout: 8000,
      }),
      root.getByTestId("examples-editor").first().waitFor({
        state: "visible",
        timeout: 8000,
      }),
      root.locator('[data-pwtestid="examples-main"][data-panel="details"]').first().waitFor({
        state: "visible",
        timeout: 8000,
      }),
    ]).catch(() => {
      // If none of the expected content appears, continue anyway
      // as different examples might have different viewer types
      console.log(
        "Details view content selectors not found, proceeding with timeout",
      );
    });
  }

  private async waitForExamplesListToLoad(): Promise<void> {
    const root = await this.waitForExamplesRoot();

    await root
      .locator(
        ':scope [data-pwtestid="examples-table"], :scope [data-pwtestid="examples-row"], :scope [data-pwtestid="examples-empty"]',
      )
      .first()
      .waitFor({
        state: "visible",
        timeout: 8000,
      })
      .catch(() => {
        console.log("Examples list not found, proceeding with timeout");
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
