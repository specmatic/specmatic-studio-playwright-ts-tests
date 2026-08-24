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
  private readonly validExamplesTable: Locator;
  private readonly invalidExamplesTable: Locator;
  private readonly downloadExamplesBtn: Locator;
  private readonly exampleDiv: Locator;
  private readonly examplesRoot: Locator;
  private readonly selectAllCheckboxSelector: string;
  private readonly bulkDeleteBtnSelector: string;
  private readonly bulkGenerateBtnSelector: string;
  private readonly bulkValidateBtnSelector: string;
  private readonly bulkFixBtnSelector: string;
  private readonly inlineBtnSelector: string;
  private readonly specSection: Locator;
  private readonly specEditorSection: Locator;
  private readonly specTabLocator: Locator;
  private readonly editorViewToggleButton: Locator;
  private readonly specEditorHelper: SpecEditorPage;
  private readonly protocol: "openapi" | "async";

  constructor(
    page: Page,
    testInfo: TestInfo,
    eyes: any,
    specName: string,
    protocol: "openapi" | "async" = "openapi",
  ) {
    super(page, testInfo, eyes, specName);
    this.protocol = protocol;
    this.specTree = page.locator("#spec-tree");
    const filePathText = `File path: ./${specName}`;
    this.specSection = page
      .locator(".screen")
      .filter({
        has: page.locator(`.info span[data-path]:has-text("${filePathText}")`),
      })
      .first();
    this.specEditorSection = this.specSection.locator(".details .spec").first();
    this.specTabLocator = this.specSection
      .locator('li.tab[data-type="spec"]')
      .first();
    this.editorViewToggleButton = this.specSection
      .locator("#editor-view-toggle-btn")
      .first();
    this.generateExamplesBtn = this.specSection.locator(
      'li.tab[data-type="example"]',
    );
    this.exampleDiv = this.specSection.locator(
      `div.example[data-protocol="${protocol}"]`,
    );
    this.examplesRoot = this.exampleDiv;
    this.validExamplesTable = this.specSection.locator("#valid-examples-table");
    this.invalidExamplesTable = this.specSection.locator(
      "#invalid-examples-table",
    );
    this.downloadExamplesBtn = this.specSection.locator(
      "button#download-examples",
    );
    this.openApiTabPage = new OpenAPISpecTabPage(this);
    this.selectAllCheckboxSelector = 'input[data-scope="all"]';
    this.bulkDeleteBtnSelector = 'button[data-action="delete"]';
    this.bulkGenerateBtnSelector = 'button[data-action="generate"]';
    this.bulkValidateBtnSelector = 'button[data-action="validate"]';
    this.inlineBtnSelector = 'button[data-action="import"]';
    this.bulkFixBtnSelector = 'button[data-action="fix"]';
    this.specEditorHelper = new SpecEditorPage(page);
  }

  private async openExampleGenerationTab() {
    console.log("Opening Example Generation tab");
    return this.openApiTabPage.openExampleGenerationTab();
  }

  private normalizeExamplePath(endpoint: string): string {
    return endpoint.replace(/\(([^:()]+):[^()]+\)/g, "{$1}");
  }

  private getRowsForPathAndResponse(
    root: Locator,
    endpoint: string,
    responseCode: number,
  ): Locator {
    const normalizedEndpoint = this.normalizeExamplePath(endpoint);
    return root.locator(
      `xpath=.//tr[
        (
          @data-example-path="/${normalizedEndpoint}"
          and @data-example-response-code="${responseCode}"
        )
        or
        (
          starts-with(@data-key, "/${normalizedEndpoint}_")
          and .//td[contains(@class, "response-cell")]/p[normalize-space(.)="${responseCode}"]
        )
        or
        (
          .//span[normalize-space(.)="/${normalizedEndpoint}"]
          and .//td[contains(@class, "response-cell")]/p[normalize-space(.)="${responseCode}"]
        )
      ]`,
    );
  }

  private getRowForPathAndResponse(
    root: Locator,
    endpoint: string,
    responseCode: number,
    preferLatest = false,
  ): Locator {
    const rows = this.getRowsForPathAndResponse(root, endpoint, responseCode);
    return preferLatest ? rows.last() : rows.first();
  }

  private async getRowWithVisibleControl(
    root: Locator,
    endpoint: string,
    responseCode: number,
    controlSelector: string,
    preferLatest = false,
    timeout = 8000,
  ): Promise<Locator> {
    const rows = this.getRowsForPathAndResponse(root, endpoint, responseCode);
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeout) {
      const count = await rows.count();
      const indexes = [...Array(count).keys()];
      if (preferLatest) {
        indexes.reverse();
      }

      for (const index of indexes) {
        const row = rows.nth(index);
        const control = row.locator(controlSelector).first();
        if (await control.isVisible().catch(() => false)) {
          return row;
        }
      }

      await this.page.waitForTimeout(250);
    }

    return preferLatest ? rows.last() : rows.first();
  }

  private normalizeDialogTitle(value: string): string {
    return value.trim().toLowerCase();
  }

  private dialogTitleMatches(
    actualTitle: string,
    expectedTitle: string,
  ): boolean {
    const actual = this.normalizeDialogTitle(actualTitle);
    const expected = this.normalizeDialogTitle(expectedTitle);

    if (expected.includes("example generated")) {
      return (
        actual.includes("generated") ||
        actual.includes("no more examples can be generated")
      );
    }

    if (expected.includes("converted example to partial")) {
      return actual.includes("converted to partial");
    }

    return actual.includes(expected);
  }

  private async clickGenerateButton(
    endpoint: string,
    responseCode: number,
    withVisualValidation = true,
  ) {
    const root = await this.waitForExamplesIFrame();
    const row = await this.getRowWithVisibleControl(
      root,
      endpoint,
      responseCode,
      'button[data-row-action="generate"], button.examples-generate-more',
    );
    const generateBtns = row.locator(
      'button[data-row-action="generate"], button.examples-generate-more',
    );
    const count = await generateBtns.count();
    if (count === 0) {
      await this.printDebugInfoForAvailableEndpoints(
        root,
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
    const allRows = await root.locator("tr[data-key]").all();
    const debugRows = [];
    for (const row of allRows) {
      const key = await row.getAttribute("data-key");
      const examplePath = await row.getAttribute("data-example-path");
      // Find all response codes in this row
      const responseCells = await row.locator("td.response-cell p").all();
      const codes = [];
      for (const cell of responseCells) {
        const text = (await cell.textContent())?.trim();
        if (text) codes.push(text);
      }
      const pathText = (
        await row
          .locator("td span")
          .first()
          .textContent()
          .catch(() => "")
      )?.trim();
      debugRows.push({ key, examplePath, pathText, codes });
    }
    console.error(
      `No generate button found for endpoint: ${endpoint}, responseCode: ${responseCode}`,
    );
    console.error(
      "Available rows (data-key/data-example-path/pathText and response codes):",
      JSON.stringify(debugRows, null, 2),
    );
  }

  private async verifyGenerateButtonNotVisible(
    endpoint: string,
    responseCode: number,
  ) {
    const root = await this.waitForExamplesIFrame();
    const rowLocator = this.getRowForPathAndResponse(
      root,
      endpoint,
      responseCode,
    );
    const generateBtn = rowLocator.locator(
      'button[data-row-action="generate"]:not(.examples-generate-more)',
    );
    await expect(generateBtn).toBeHidden({ timeout: 4000 });
  }

  private async verifyExampleFileNameVisible(
    endpoint: string,
    responseCode: number,
    withVisualValidation = true,
  ) {
    const root = await this.waitForExamplesIFrame();
    const row = await this.getRowWithVisibleControl(
      root,
      endpoint,
      responseCode,
      "inline-filename-rename",
      true,
    );
    const fileNameSpan = row.locator(".ifr__filename").first();
    await expect(fileNameSpan).toBeVisible({ timeout: 4000 });
    const fileNameText = (await fileNameSpan.textContent())?.trim();
    expect(fileNameText).not.toBe("");
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
    const root = await this.waitForExamplesIFrame();
    await takeAndAttachScreenshot(
      this.page,
      `validate-button-visible-${endpoint}-${responseCode}`,
      withVisualValidation ? this.eyes : undefined,
    );
    const row = await this.getRowWithVisibleControl(
      root,
      endpoint,
      responseCode,
      'button[data-row-action="validate"]',
      true,
    );
    const validateBtn = row.locator('button[data-row-action="validate"]');
    await expect(validateBtn).toBeVisible({ timeout: 4000 });
  }

  async clickViewDetails(
    endpoint: string,
    responseCode: number,
    withVisualValidation = true,
    targetNewlyGenerated = false,
  ) {
    const root = await this.waitForExamplesIFrame();
    let viewDetailsButton: Locator;

    if (targetNewlyGenerated) {
      const row = await this.getRowWithVisibleControl(
        root,
        endpoint,
        responseCode,
        'button[data-row-action="details"]',
        true,
      );
      await expect(row).toBeAttached({ timeout: 5000 });
      viewDetailsButton = row.locator('button[data-row-action="details"]');
    } else {
      const row = await this.getRowWithVisibleControl(
        root,
        endpoint,
        responseCode,
        'button[data-row-action="details"]',
        true,
      );
      viewDetailsButton = row.locator('button[data-row-action="details"]');
      await expect(viewDetailsButton).toBeVisible({ timeout: 4000 });
    }

    await viewDetailsButton.click({ force: true });

    await this.waitForDetailsViewToLoad();
    await this.page.waitForTimeout(1000);

    await takeAndAttachScreenshot(
      this.page,
      `view-details-${endpoint}-${responseCode}`,
      withVisualValidation ? this.eyes : undefined,
    );
  }

  private getInlineRows(name: string, context?: string): Locator {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nameCell = this.examplesRoot
      .locator("td.examples-name-cell")
      .filter({ hasText: new RegExp(`(^|\\s)${escapedName}(?=\\s|$)`) })
      .filter({ hasText: /(^|\s)Inline(\s|$)/ });

    let rows = nameCell.locator("xpath=..");
    if (context) rows = rows.filter({ hasText: context });
    return rows;
  }

  async assertInlineExamplesListed(names: string[]): Promise<void> {
    await test.step(`Verify inline examples are listed: ${names.join(", ")}`, async () => {
      await this.waitForExamplesIFrame();
      for (const name of names) {
        await expect(this.getInlineRows(name).first()).toBeVisible({ timeout: 10000 });
      }
    });
  }

  async assertInlineExampleCount(name: string, expectedCount: number): Promise<void> {
    await test.step(`Verify ${expectedCount} inline rows for '${name}'`, async () => {
      await this.waitForExamplesIFrame();
      await expect(this.getInlineRows(name)).toHaveCount(expectedCount, {
        timeout: 10000,
      });
    });
  }

  async openInlineExample(name: string, context?: string): Promise<void> {
    await test.step(`Open inline example '${name}'`, async () => {
      await this.waitForExamplesIFrame();
      const rows = this.getInlineRows(name, context);
      await expect(rows).toHaveCount(1, { timeout: 10000 });

      const row = rows.first();
      const detailsButton = row.locator('button[data-row-action="details"]');
      await expect(detailsButton).toBeVisible({ timeout: 5000 });

      await detailsButton.click();
      await this.waitForDetailsViewToLoad();
    });
  }

  async assertInlineDetailsEditable(expectedContent: string[], expectedLocation: string): Promise<void> {
    await test.step("Verify inline example details are editable", async () => {
      const root = await this.waitForExamplesIFrame();
      const editor = root.locator("code-editor");

      await expect(editor).toBeVisible({ timeout: 8000 });
      await expect
        .poll(() => editor.evaluate((element) => (element as any).readOnly))
        .toBe(false);

      await expect(editor.locator(".cm-content")).toHaveAttribute("contenteditable", "true");
      const content = await this.getEditorContent();

      for (const fragment of expectedContent) expect(content).toContain(fragment);
      await expect(root.locator(".examples-detail-file-path")).toContainText(expectedLocation);

      await expect(
        root.locator("inline-filename-rename.examples-details__filename-rename"),
      ).toBeVisible();

      await expect(
        root.locator('button[data-details-action="validate"]'),
      ).toBeVisible();
    });
  }

  async assertInlineFixActionVisible(): Promise<void> {
    await test.step("Verify inline example auto-fix action is available", async () => {
      const root = await this.waitForExamplesIFrame();
      const fixButton = root.locator('button[data-details-action="fix"]');
      await expect(fixButton).toBeVisible();
      await expect(fixButton).toBeEnabled();
    });
  }

  async assertInlineFixActionHidden(): Promise<void> {
    await test.step("Verify inline example auto-fix action is hidden", async () => {
      const root = await this.waitForExamplesIFrame();
      await expect(root.locator('button[data-details-action="fix"]')).toHaveCount(0);
    });
  }

  async assertInlineValidationDetails(
    expectedStatus: "Valid Example" | "Invalid Example",
    expectErrorHighlight = false,
  ): Promise<void> {
    await test.step(`Verify inline validation details show '${expectedStatus}'`, async () => {
      const root = await this.waitForExamplesIFrame();
      await expect(root.locator(".examples-detail-summary .expand-info > .pill")).toHaveText(expectedStatus);

      if (expectedStatus === "Invalid Example") {
        await expect(root.locator(".examples-detail-issues.error")).toBeVisible();
      }

      if (expectErrorHighlight) {
        await expect(root.locator(".specmatic-lintRange--error")).not.toHaveCount(0);
      }
    });
  }

  async validateInlineExample(
    name: string,
    context?: string,
    expectedValidationClass = "green",
  ): Promise<void> {
    await test.step(`Validate inline example '${name}'`, async () => {
      const root = await this.waitForExamplesIFrame();
      const goBackButton = root.locator("#back");
      if (await goBackButton.isVisible().catch(() => false)) {
        await this.goBackFromExample();
      }

      const rows = this.getInlineRows(name, context);
      await expect(rows).toHaveCount(1, { timeout: 10000 });

      const validateButton = rows.first().locator('button[data-row-action="validate"]');
      await expect(validateButton).toBeVisible({ timeout: 5000 });

      await validateButton.click();
      await expect
        .poll(() => validateButton.getAttribute("class"), {
          timeout: 30000,
          message: `Waiting for inline example '${name}' to validate`,
        })
        .toContain(expectedValidationClass);
    });
  }

  async assertInlineValidationState(
    name: string,
    context?: string,
    expectedValidationClass = "green",
  ): Promise<void> {
    await test.step(`Verify validation state for inline example '${name}'`, async () => {
      await this.waitForExamplesIFrame();
      const row = this.getInlineRows(name, context).first();
      await expect(row).toBeVisible({ timeout: 10000 });
      await expect(row.locator('button[data-row-action="validate"]')).toHaveClass(new RegExp(expectedValidationClass));
    });
  }

  private async clickGoBack(endpoint: string, responseCode: number) {
    const root = await this.waitForExamplesIFrame();
    const goBackBtn = root.locator("#back");
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
    const root = await this.waitForExamplesIFrame();
    const row = await this.getRowWithVisibleControl(
      root,
      endpoint,
      responseCode,
      'button[data-row-action="validate"]',
      true,
    );
    const validateBtn = row.locator('button[data-row-action="validate"]');
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
    await expect(alert).toBeVisible({ timeout: 15000 });

    const title = await this.getDialogTitle(alert);
    const message = await this.getDialogMessage(alert);
    expect
      .soft(
        this.dialogTitleMatches(title, expectedTitle),
        `Expected dialog title '${expectedTitle}' but found '${title}'`,
      )
      .toBeTruthy();

    await alert.locator(".examples-alert-close").click();
    console.log(
      `\t\tClicked close button on dialog with title: '${expectedTitle}' Vs Actual: '${title}'`,
    );
    await this.page.waitForTimeout(1000);
    await takeAndAttachScreenshot(
      this.page,
      `after-closing-dialog-${expectedTitle.replace(/\s+/g, "-").toLowerCase()}`,
    );
    await expect(alert).toBeHidden({ timeout: 5000 });
  }

  private async getAlertContainerFrameAndLocator(): Promise<{
    alert: Locator;
  }> {
    const root = await this.waitForExamplesIFrame();
    const alert = root.locator(".examples-alerts .examples-alert").first();
    return { alert };
  }

  private async getDialogTitle(alert: Locator): Promise<string> {
    const dialogTitle = await alert
      .locator(".examples-alert-content strong")
      .first()
      .innerText();
    console.log("\t\tActual dialog title:", dialogTitle);
    return dialogTitle;
  }

  private async getDialogMessage(alert: Locator): Promise<string> {
    let dialogMessage = "";
    const messageLocator = alert.locator(
      ".examples-alert-message, .examples-alert-detail",
    );
    if ((await messageLocator.count()) > 0) {
      dialogMessage = (await messageLocator.first().innerText()).trim();
    }
    console.log("\t\tActual dialog message:", dialogMessage);
    return dialogMessage;
  }

  private async saveAndValidate(withVisualValidation = true) {
    await test.step(`Click 'Save & Validate' button`, async () => {
      const root = await this.waitForExamplesIFrame();
      const saveValidateBtn = root.locator(
        'button[data-details-action="validate"]',
      );
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
      const root = await this.waitForExamplesIFrame();
      await this.selectAll(root);

      const bulkDeleteBtn = root.locator(this.bulkDeleteBtnSelector);
      let deleteClicked = false;
      if (await bulkDeleteBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await takeAndAttachScreenshot(this.page, `click-bulk-delete`);
        await bulkDeleteBtn.click();
        deleteClicked = true;
        console.log("\tbulk-delete button clicked");
        await takeAndAttachScreenshot(this.page, `clicked-bulk-delete`);
      }

      if (deleteClicked) {
        await this.verifyTitleAndCloseDialog(
          this.protocol === "async"
            ? "Examples deleted"
            : "Delete Examples Complete",
        );
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
    await test.step(`Delete generated example for /${path} ${responseCode}`, async () => {
      const root = await this.waitForExamplesIFrame();
      const generatedRow = this.getRowForPathAndResponse(
        root,
        path,
        responseCode,
        true,
      );
      await expect(generatedRow.first()).toBeVisible({ timeout: 5000 });

      const generatedFileName = (
        await generatedRow
          .first()
          .locator("inline-filename-rename .ifr__filename")
          .textContent()
      )?.trim();
      const rowCheckbox = generatedRow
        .first()
        .locator('input[type="checkbox"]')
        .first();
      await expect(rowCheckbox).toBeVisible({ timeout: 3000 });
      await rowCheckbox.check({ force: true });

      await takeAndAttachScreenshot(
        this.page,
        `selected-generated-example-${path}-${responseCode}`,
      );

      const bulkDeleteBtn = root.locator(this.bulkDeleteBtnSelector);
      await expect(bulkDeleteBtn).toBeVisible({ timeout: 3000 });
      await bulkDeleteBtn.click();
      await this.verifyTitleAndCloseDialog("Delete Examples Complete");

      if (generatedFileName) {
        await expect(
          this.getRowForPathAndResponse(root, path, responseCode).locator(
            "inline-filename-rename",
          ),
        ).toHaveCount(0, { timeout: 5000 });
      }

      await takeAndAttachScreenshot(
        this.page,
        `deleted-generated-example-${path}-${responseCode}`,
      );
    });
  }

  async deleteInlineExample(name: string, context?: string): Promise<void> {
    await test.step(`Delete inline example '${name}'`, async () => {
      const root = await this.waitForExamplesIFrame();
      const row = this.getInlineRows(name, context).first();
      await expect(row).toBeVisible({ timeout: 5000 });

      const rowCheckbox = row.locator('input[type="checkbox"]').first();
      await expect(rowCheckbox).toBeVisible({ timeout: 3000 });
      await rowCheckbox.check({ force: true });

      const bulkDeleteBtn = root.locator(this.bulkDeleteBtnSelector);
      await expect(bulkDeleteBtn).toBeVisible({ timeout: 3000 });
      await bulkDeleteBtn.click();

      await this.verifyTitleAndCloseDialog(this.protocol === "async" ? "Examples deleted" : "Delete Examples Complete");
      await expect(this.getInlineRows(name, context)).toHaveCount(0, { timeout: 5000});
    });
  }

  private async selectAll(root: Locator) {
    const selectAll = root.locator(this.selectAllCheckboxSelector);
    await selectAll.waitFor({ timeout: 3000 });
    const count = await selectAll.count();
    console.log(`\tselect-all checkbox found, count: ${count}`);

    if (count === 0) {
      throw new Error(
        `selectAll: No checkboxes found for selector '${this.selectAllCheckboxSelector}'`,
      );
    }

    for (let i = 0; i < count; i++) {
      await this.setCheckboxChecked(
        selectAll.nth(i),
        true,
        `select-all checkbox[${i}]`,
      );
    }

    await takeAndAttachScreenshot(this.page, `select-all-checked`);
  }

  private async uncheckSelectAll(root: Locator) {
    const selectAll = root.locator(this.selectAllCheckboxSelector);
    await selectAll.waitFor({ timeout: 3000 });
    console.log("\tuncheck select-all checkbox found");
    if (await selectAll.isChecked()) {
      await this.setCheckboxChecked(
        selectAll.first(),
        false,
        "select-all checkbox",
      );
      console.log("\tselect-all checkbox unchecked");
      await takeAndAttachScreenshot(this.page, `select-all-unchecked`);
    }
  }

  private async setCheckboxChecked(
    checkbox: Locator,
    checked: boolean,
    label: string,
  ) {
    await expect(checkbox).toBeAttached({ timeout: 5000 });
    await expect(checkbox).toBeEnabled({ timeout: 5000 });

    for (let attempt = 1; attempt <= 3; attempt++) {
      await checkbox.scrollIntoViewIfNeeded().catch(() => {});

      try {
        if (checked) {
          await checkbox.check({ force: true, timeout: 2000 });
        } else {
          await checkbox.uncheck({ force: true, timeout: 2000 });
        }
      } catch (error) {
        console.log(
          `\t${label} ${checked ? "check" : "uncheck"} attempt ${attempt} failed: ${error}`,
        );
        await checkbox.evaluate((element, targetChecked) => {
          const input = element as HTMLInputElement;
          if (input.checked !== targetChecked) {
            input.click();
          }
        }, checked);
      }

      const currentState = await checkbox.isChecked();
      console.log(
        `\t${label} checked after attempt ${attempt}: ${currentState}`,
      );
      if (currentState === checked) {
        return;
      }

      await this.page.waitForTimeout(200 * attempt);
    }

    throw new Error(
      `${label} could not be ${checked ? "checked" : "unchecked"} after 3 attempts`,
    );
  }

  async waitForExamplesIFrame() {
    await this.examplesRoot.waitFor({ state: "visible", timeout: 10000 });
    await expect
      .poll(
        async () => {
          const locator = this.examplesRoot.locator(
            "table.examples-protocol-table, .examples-empty, #examples, code-editor .cm-content, .examples-detail-issues, #back",
          );
          const count = await locator.count();
          for (let i = 0; i < count; i++) {
            if (
              await locator
                .nth(i)
                .isVisible()
                .catch(() => false)
            ) {
              return true;
            }
          }
          return false;
        },
        {
          timeout: 10000,
          intervals: [200, 400, 800],
          message:
            "Waiting for examples list or details view to become visible",
        },
      )
      .toBeTruthy();
    console.log("\tExamples panel is visible");
    return this.examplesRoot;
  }

  private async waitForExamplesContentReady(
    iframe: import("@playwright/test").Frame,
  ) {
    await expect
      .poll(
        async () => {
          const locator = this.examplesRoot.locator(
            "table.examples-protocol-table, #valid-examples-table, #invalid-examples-table, .examples-empty, #examples, code-editor .cm-content, .examples-detail-issues, #back, table",
          );
          const count = await locator.count();
          for (let i = 0; i < count; i++) {
            if (
              await locator
                .nth(i)
                .isVisible()
                .catch(() => false)
            ) {
              return true;
            }
          }
          return false;
        },
        {
          timeout: 10000,
          intervals: [200, 400, 800],
          message: "Waiting for examples iframe content to become interactive",
        },
      )
      .toBeTruthy();
  }

  private async getGeneratedExamplesCount(
    iframe: import("@playwright/test").Frame,
  ): Promise<number> {
    return await iframe.locator("tr[data-example-relative-path]").count();
  }

  private async getInteractiveSelectAllCheckbox(
    iframe: import("@playwright/test").Frame,
  ): Promise<Locator> {
    const selectAll = iframe.locator(this.selectAllCheckboxSelector);
    await selectAll.first().waitFor({ state: "attached", timeout: 5000 });

    const count = await selectAll.count();
    console.log(`\tselect-all checkbox found, count: ${count}`);

    for (let i = 0; i < count; i++) {
      const checkbox = selectAll.nth(i);
      const [visible, enabled] = await Promise.all([
        checkbox.isVisible().catch(() => false),
        checkbox.isEnabled().catch(() => false),
      ]);

      console.log(
        `\tselect-all checkbox[${i}] visible=${visible} enabled=${enabled}`,
      );

      if (visible && enabled) {
        return checkbox;
      }
    }

    return selectAll.first();
  }

  async validateAllExamples() {
    await test.step(`Validate all generated examples`, async () => {
      console.log(`Validating all generated examples`);
      const root = await this.waitForExamplesIFrame();
      const generatedExamplesBeforeValidation =
        await this.getNumberOfExamplesGenerated();

      expect(
        generatedExamplesBeforeValidation,
        "Expected generated examples before bulk validation",
      ).toBeGreaterThan(0);

      await this.selectAll(root);
      await this.clickBulkValidateButton();

      await this.waitForProcessingToComplete(
        root,
        this.bulkValidateBtnSelector,
      );
      await expect
        .poll(
          async () => await this.getNumberOfExamplesValidated(),
          {
            timeout: 30000,
            intervals: [500, 1000, 2000],
            message:
              "Waiting for all generated examples to move into validated state",
          },
        )
        .toBe(generatedExamplesBeforeValidation);

      const dialogDetails = await this.getDialogTitleAndMessageIfPresent(3000);
      if (dialogDetails) {
        const [actualTitle] = dialogDetails;
        expect
          .soft(
            this.dialogTitleMatches(
              actualTitle,
              "Example Validations Complete",
            ),
            `Expected validation completion dialog but found '${actualTitle}'`,
          )
          .toBeTruthy();
      } else {
        console.log(
          "\tValidation completion dialog did not appear; proceeding based on validated row state",
        );
      }
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
      const root = await this.waitForExamplesIFrame();
      await this.selectAll(root);
      await this.clickBulkGenerateButton();

      await this.waitForProcessingToComplete(
        root,
        this.bulkGenerateBtnSelector,
      );
      await takeAndAttachScreenshot(
        this.page,
        `generate-examples-for-all-paths`,
        this.eyes,
      );
    });
  }

  private async waitForProcessingToComplete(
    root: Locator,
    buttonSelector: string,
  ) {
    console.log(`\t\tWaiting for processing to complete...`);
    const processingBtn = root.locator(
      `${buttonSelector}[data-processing="true"]`,
    );
    await processingBtn
      .waitFor({ state: "visible", timeout: 5000 })
      .catch(() => {
        console.log(
          "\t\tProcessing state did not appear within 5 seconds, proceeding to completion check",
        );
      });
    await expect(processingBtn).toBeHidden({ timeout: 60000 });
  }

  async getNumberOfPathMethodsAndResponses(): Promise<number> {
    const root = await this.waitForExamplesIFrame();
    const exampleRows = await root.locator("tr[data-row-id]").all();
    console.log(
      `\tTotal number of path-method-response combinations: ${exampleRows.length}`,
    );
    return exampleRows.length;
  }

  async getNumberOfGenerateButtons(): Promise<number> {
    const root = await this.waitForExamplesIFrame();
    const generateButtons = await root
      .locator('button[data-row-action="generate"]')
      .all();
    console.log(
      `\tNumber of Generate buttons available: ${generateButtons.length}`,
    );
    return generateButtons.length;
  }

  async getNumberOfValidateButtons(): Promise<number> {
    const root = await this.waitForExamplesIFrame();
    const validateButtons = await root
      .locator('button[data-row-action="validate"]')
      .all();
    console.log(
      `\tNumber of Validate buttons available: ${validateButtons.length}`,
    );
    return validateButtons.length;
  }

  async getNumberOfExamplesValidated(): Promise<number> {
    const root = await this.waitForExamplesIFrame();
    const exampleRows = await root.locator("tr[data-valid=success]").all();
    console.log(
      `\tTotal endpoints with generated examples: ${exampleRows.length}`,
    );
    return exampleRows.length;
  }

  async getNumberOfExamplesGenerated(): Promise<number> {
    const root = await this.waitForExamplesIFrame();
    const exampleRows = await root.locator('tr[data-generate="success"]').all();
    console.log(
      `\tTotal endpoints with generated examples: ${exampleRows.length}`,
    );
    return exampleRows.length;
  }

  private async clickBulkGenerateButton() {
    const root = await this.waitForExamplesIFrame();
    const bulkGenerateBtn = root.locator(this.bulkGenerateBtnSelector);
    await bulkGenerateBtn.waitFor({ state: "visible", timeout: 4000 });
    await expect(bulkGenerateBtn).toBeVisible({ timeout: 4000 });
    await expect(bulkGenerateBtn).toBeEnabled({ timeout: 4000 });
    await bulkGenerateBtn.click();
    await takeAndAttachScreenshot(this.page, "clicked-generate");
  }
  private async clickBulkValidateButton() {
    const root = await this.waitForExamplesIFrame();
    const bulkValidateBtn = root.locator(this.bulkValidateBtnSelector);
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
      const root = await this.waitForExamplesIFrame();
      const inlineBtn = root.locator(this.inlineBtnSelector);
      await inlineBtn.waitFor({ state: "visible", timeout: 4000 });
      await expect(inlineBtn).toBeVisible({ timeout: 4000 });
      await expect(inlineBtn).toBeEnabled({ timeout: 4000 });
      await inlineBtn.click();
      await this.waitForInlineToComplete(root);
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

  async getDialogTitleAndMessageIfPresent(
    timeout = 5000,
  ): Promise<[string, string] | null> {
    return await test.step(`Get dialog title and message if present`, async () => {
      console.log(`\tGetting dialog title and message if present`);
      const { alert } = await this.getAlertContainerFrameAndLocator();
      const dialogContent = alert.locator(
        ".examples-alert-content strong, .examples-alert-message, .examples-alert-detail",
      );
      const isDialogVisible = await dialogContent
        .first()
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

      const closeButton = alert.locator(".examples-alert-close").first();
      if (await closeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await closeButton.click();
        await this.page.waitForTimeout(1000);
        await expect(alert).toBeHidden({ timeout: 5000 });
      }

      return [title, message];
    });
  }

  private async waitForInlineToComplete(root: Locator) {
    console.log(`\t\tWaiting for inline operation to complete...`);
    const inlineBtn = root.locator(this.inlineBtnSelector);
    const processingInlineBtn = root.locator(
      `${this.inlineBtnSelector}[data-processing="true"]`,
    );

    await processingInlineBtn
      .waitFor({ state: "visible", timeout: 5000 })
      .catch(() => {
        console.log(
          "\t\tInline button did not switch to 'Processing' within 5 seconds, checking whether the action already completed",
        );
      });

    await expect(processingInlineBtn).toBeHidden({ timeout: 60000 });
    await expect(inlineBtn).toBeHidden({ timeout: 10000 });
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
    await test.step(`Convert current example to partial and verify dialog for '${exampleName}'`, async () => {
      const root = await this.waitForExamplesIFrame();
      const convertToPartialButton = root.locator(
        'button[data-details-action="partialize"]',
      );
      await expect(convertToPartialButton).toBeVisible({ timeout: 5000 });
      await convertToPartialButton.click();

      await takeAndAttachScreenshot(
        this.page,
        "converted-example-to-partial",
        this.eyes,
      );

      const alert = root
        .locator(".examples-alerts .examples-alert.success")
        .first();
      await expect(alert).toBeVisible({ timeout: 5000 });

      const title = (await alert.locator("strong").first().innerText()).trim();
      const message = (
        await alert.locator(".examples-alert-message").first().innerText()
      ).trim();
      expect(title).toBe("Converted to partial");
      expect(message).toBe(`Example name: ${exampleName}`);

      const closeButton = alert.locator(".examples-alert-close").first();
      await closeButton.click();
      await expect(alert).toBeHidden({ timeout: 5000 });
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
      const dialogDetails = await this.getDialogTitleAndMessageIfPresent(3000);

      if (!dialogDetails) {
        const generatedExamplesCount = await this.getNumberOfExamplesGenerated();
        expect(
          generatedExamplesCount,
          "Expected generated examples even when the bulk-generation dialog is not shown",
        ).toBeGreaterThan(0);
        console.log(
          "\tGeneration completion dialog did not appear; proceeding based on generated row state",
        );
        return;
      }

      const [actualTitle] = dialogDetails;
      expect
        .soft(
          this.dialogTitleMatches(actualTitle, `${dialogTitle}`),
          `Expected generation completion dialog '${dialogTitle}' but found '${actualTitle}'`,
        )
        .toBeTruthy();
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
      const root = await this.waitForExamplesIFrame();
      const autoFixBtn = root.locator('button[data-details-action="fix"]');

      await autoFixBtn.waitFor({ state: "attached", timeout: 4000 });

      const isVisible = await autoFixBtn.isVisible();
      const isEnabled = await autoFixBtn.isEnabled();

      if (!isVisible || !isEnabled) {
        console.warn(
          "Fix Example button is not enabled/visible, skipping auto-fix step.",
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
      const root = await this.waitForExamplesIFrame();
      const detailsDiv = root.locator("div.examples-detail-issues");
      const classAttr = await detailsDiv.getAttribute("class");
      if (!classAttr || !classAttr.includes("expanded")) {
        await detailsDiv.click();
        await expect(detailsDiv).toHaveClass(/expanded/, { timeout: 3000 });
      }
      const expandedDiv = root.locator("div.examples-detail-issues.expanded");
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
      const root = await this.waitForExamplesIFrame();
      const detailsDiv = root.locator("div.examples-detail-issues");
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
      const root = await this.waitForExamplesIFrame();
      const detailsDiv = root.locator("div.examples-detail-issues");

      const classAttr = await detailsDiv.getAttribute("class");
      if (!classAttr?.includes("expanded")) {
        await detailsDiv.click();
        await expect(detailsDiv).toHaveClass(/expanded/, { timeout: 3000 });
      }

      const expandedDiv = root.locator("div.examples-detail-issues.expanded");
      await expect(expandedDiv).toBeVisible({ timeout: 5000 });

      const pre = expandedDiv.locator("pre");
      let preText = "";
      if ((await pre.count()) > 0) {
        preText = (await pre.first().textContent()) || "";
      }

      const count = preText
        .split("\n")
        .filter((line) => line.trim().length > 0).length;

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
      const root = await this.waitForExamplesIFrame();
      const lines = root.locator("code-editor .cm-line");

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
      const examplesTabLi = this.specSection
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
      const root = await this.waitForExamplesIFrame();
      const row = await this.getRowWithVisibleControl(
        root,
        path,
        responseCode,
        "button.examples-generate-more",
        true,
      );
      const generateMoreBtn = row.locator("button.examples-generate-more");
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
    const root = await this.waitForExamplesIFrame();
    const fileNames = root.locator(`tr[data-key^="/${rawPath}_"] inline-filename-rename .ifr__filename`);
    return fileNames.evaluateAll((elements) =>
        elements
          .map((element) => element.textContent?.trim())
          .filter((fileName): fileName is string => Boolean(fileName)),
    );
  }

  async renameGeneratedExample(
    path: string,
    responseCode: number,
    newFileName: string,
    preferLatest = false,
  ): Promise<void> {
    await test.step(`Rename generated example to '${newFileName}'`, async () => {
      const root = await this.waitForExamplesIFrame();
      const row = await this.getRowWithVisibleControl(
        root,
        path,
        responseCode,
        "inline-filename-rename",
        preferLatest,
      );

      const renameControl = row.locator("inline-filename-rename").first();
      const currentFileName = (await renameControl.locator(".ifr__filename").textContent())?.trim();
      const extension = currentFileName?.includes(".")
        ? currentFileName.slice(currentFileName.lastIndexOf("."))
        : "";

      const newBaseName = extension && newFileName.endsWith(extension)
        ? newFileName.slice(0, -extension.length)
        : newFileName;

      await renameControl.locator(".ifr__action").click();
      const input = renameControl.locator(".ifr__input--basename");
      await expect(input).toBeVisible({ timeout: 3000 });
      await input.fill(newBaseName);
      await input.press("Enter");

      await expect.poll(() => renameControl.getAttribute("aria-busy"), { timeout: 10000 }).toBeNull();
    });
  }

  async renameInlineExample(name: string, newName: string, context?: string): Promise<void> {
    await test.step(`Rename inline example to '${newName}'`, async () => {
      await this.waitForExamplesIFrame();
      const row = this.getInlineRows(name, context).first();
      await expect(row).toBeVisible({ timeout: 5000 });

      const renameControl = row.locator("inline-filename-rename").first();
      await expect(renameControl).toBeVisible({ timeout: 3000 });

      await renameControl.locator(".ifr__action").click();
      const input = renameControl.locator(".ifr__input--basename");
      await expect(input).toBeVisible({ timeout: 3000 });

      await input.fill(newName);
      await input.press("Enter");
      await expect(this.getInlineRows(newName, context)).toHaveCount(1, { timeout: 10000 });
    });
  }

  async getRenameError(
    path: string,
    responseCode: number,
    preferLatest = false,
  ): Promise<string> {
    const root = await this.waitForExamplesIFrame();
    const row = await this.getRowWithVisibleControl(
      root,
      path,
      responseCode,
      "inline-filename-rename",
      preferLatest,
    );

    const error = row.locator("inline-filename-rename .ifr__error").first();
    await expect(error).toBeVisible({ timeout: 5000 });
    return (await error.innerText()).trim();
  }

  async getGeneratedExampleNames(): Promise<string[]> {
    return await test.step(`Get generated example names`, async () => {
      console.log(`Getting generated example names from Examples tab`);
      const root = await this.waitForExamplesIFrame();
      const exampleRows = await root
        .locator('tr[data-generate="success"]')
        .all();

      const examples: string[] = [];
      for (const row of exampleRows) {
        const exampleCell = row
          .locator(`td.examples-name-cell`)
          .first();

        let extractedName = "";
        if ((await exampleCell.count()) > 0) {
          extractedName = (await exampleCell.locator("inline-filename-rename .ifr__filename").first().textContent() ?? "").trim();
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
      await this.ensureEditorViewIfTogglePresent();
      await takeAndAttachScreenshot(this.page, `spec-tab-opened`);
    });
  }

  private async ensureEditorViewIfTogglePresent() {
    const editorVisible = await this.specEditorSection
      .locator(".cm-content")
      .first()
      .isVisible()
      .catch(() => false);
    if (editorVisible) {
      return;
    }

    const toggleVisible = await this.editorViewToggleButton
      .isVisible()
      .catch(() => false);
    if (!toggleVisible) {
      return;
    }

    const togglePressed =
      (await this.editorViewToggleButton.getAttribute("aria-pressed")) ===
      "true";
    if (!togglePressed) {
      await this.editorViewToggleButton.click({ force: true });
      await takeAndAttachScreenshot(
        this.page,
        "switched-example-spec-tab-to-editor-view",
        this.eyes,
      );
    }

    await expect(
      this.specEditorSection.locator(".cm-content").first(),
    ).toBeVisible({ timeout: 15000 });
  }

  async verifyInlinedExamplesInSpec(expectedExamples: string[]) {
    await test.step(`Verify inlined examples in spec file`, async () => {
      const specContent = this.readSpecFile();

      for (const name of expectedExamples) {
        const exampleKey = this.getInlineExampleKey(name);
        const filenamePresent = specContent.includes(name);
        const keyPresent = specContent.includes(`${exampleKey}:`);

        if (!(filenamePresent || keyPresent)) {
          console.error(`\t FAILED: '${name}' not found in spec file`);
          await takeAndAttachScreenshot(this.page, `failed-to-find-${name}`);
          throw new Error(
            `Example '${name}' not found in spec file '${this.specName}'`,
          );
        }

        console.log(`\t ✓ Verified: ${name} is inlined`);
      }

      await takeAndAttachScreenshot(this.page, `verified-inlined-examples`);
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

  private getInlineExampleKey(exampleName: string): string {
    const fileName = exampleName.split(/[\\/]/).pop() ?? exampleName;
    return fileName.replace(/\.json$/i, "");
  }

  async copyEditorContent(): Promise<void> {
    await test.step("Copy editor content to clipboard", async () => {
      const root = await this.waitForExamplesIFrame();
      const editor = root.locator("code-editor .cm-content");
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
      const root = await this.waitForExamplesIFrame();
      const editor = root.locator("code-editor");
      await expect(editor).toBeVisible({ timeout: 5000 });
      return await editor.evaluate((el) => {
        const codeEditor = el as HTMLElement & {
          documentString?: string;
        };
        const fullText = codeEditor.documentString;
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
      const root = await this.waitForExamplesIFrame();
      const editor = root.locator("code-editor .cm-content");
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
      const root = await this.waitForExamplesIFrame();
      const editor = root.locator("code-editor .cm-content");
      const editorScroller = root.locator("code-editor .cm-scroller");
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
      const root = await this.waitForExamplesIFrame();
      const filePathLabel = root
        .locator("p")
        .filter({ hasText: "File path:" })
        .first();
      await expect(filePathLabel).toBeVisible({ timeout: 5000 });

      const rawText = (await filePathLabel.locator(":scope > span").first().textContent())?.trim() ?? "";
      const relativePath = rawText.replace(/^File path:\s*/, "");
      if (!relativePath.startsWith("./")) {
        throw new Error(`Unexpected example file path: '${rawText}'`);
      }

      const fileName = (await root.locator("inline-filename-rename .ifr__filename").first().textContent())?.trim();
      if (!fileName) {
        throw new Error("Current example filename was not found");
      }

      return relativePath.endsWith("/") ? `${relativePath}${fileName}` : `${relativePath}/${fileName}`;
    });
  }

  async pasteIntoEditor(): Promise<void> {
    await test.step("Paste content into editor", async () => {
      const root = await this.waitForExamplesIFrame();
      const editor = root.locator("code-editor .cm-content");
      const editorScroller = root.locator("code-editor .cm-scroller");
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
      const root = await this.waitForExamplesIFrame();
      const goBackBtn = root.locator("#back");
      await expect(goBackBtn).toBeVisible({ timeout: 4000 });
      await goBackBtn.click();

      // Wait for the examples list to fully load
      await this.waitForExamplesListToLoad();
      await this.page.waitForTimeout(500);

      await takeAndAttachScreenshot(this.page, "went-back-to-examples-list");
    });
  }

  private async waitForDetailsViewToLoad(): Promise<void> {
    const root = await this.waitForExamplesIFrame();
    await Promise.race([
      root
        .locator("code-editor .cm-content")
        .first()
        .waitFor({ state: "visible", timeout: 8000 }),
      root
        .locator("#examples")
        .first()
        .waitFor({ state: "visible", timeout: 8000 }),
      root
        .locator(".examples-detail-issues, .pill")
        .first()
        .waitFor({ state: "visible", timeout: 8000 }),
    ]).catch(() => {
      // If none of the expected content appears, continue anyway
      // as different examples might have different viewer types
      console.log(
        "Details view content selectors not found, proceeding with timeout",
      );
    });
  }

  private async waitForExamplesListToLoad(): Promise<void> {
    const root = await this.waitForExamplesIFrame();
    await root
      .locator("table, tr[data-row-id]")
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
