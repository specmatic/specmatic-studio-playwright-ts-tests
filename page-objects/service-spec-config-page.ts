import { OpenAPISpecTabPage } from "./openapi-spec-tab-page";
import { Locator, expect, type TestInfo, Page, test } from "@playwright/test";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";
import { BasePage } from "./base-page";
import { SpecEditorPage } from "./spec-editor-page";

export interface Edit {
  current: {
    mode: "exact" | "keyOnly" | "keyAndAnyNumber";
    value?: string;
    key?: string;
  };
  changeTo: string;
}

export interface BackwardCompatibilityResult {
  failed: number;
  message: string;
  passed: number;
  title: string;
  total: number;
}

export interface BackwardCompatibilityIssueRow {
  fieldPath: string;
  reason: string;
  rule: string;
}

export class ServiceSpecConfigPage extends BasePage {
  private readonly openApiTabPage: OpenAPISpecTabPage;
  readonly specTree: Locator;
  readonly specBtn: Locator;
  readonly editBtn: Locator;
  readonly updateTab: Locator;
  readonly saveBtn: Locator;
  private readonly specSection: Locator;
  private readonly contractTestTab: Locator;
  readonly editorContent: Locator;
  readonly editorScroller: Locator;
  readonly editorLines: Locator;
  readonly alertMsg: Locator;
  readonly validationErrorBtn: Locator;
  readonly errorContent: Locator;
  private readonly bccTestButton: Locator;
  private readonly dictionaryGenerateButton: Locator;
  private readonly alertMessage: Locator;
  private readonly alertDismissButton: Locator;
  private readonly bccErrorToggle: Locator;
  private readonly bccErrorContent: Locator;
  private readonly runSuitebtn: Locator;
  readonly executionProgressDropdown: Locator;
  private readonly saveSpecBtn: Locator;
  readonly executionLog: Locator;
  readonly alertContainer: Locator;
  readonly alertTitle: Locator;
  readonly alertDescription: Locator;
  private readonly editorViewToggleButton: Locator;
  private readonly specEditorHelper: SpecEditorPage;

  constructor(page: Page, testInfo: TestInfo, eyes: any, specName: string) {
    super(page, testInfo, eyes, specName);
    this.specTree = page.locator("#spec-tree");
    const filePathText = `File path: ./${specName}`;
    this.specSection = page
      .locator(".screen")
      .filter({
        has: page.locator(`.info span[data-path]:has-text("${filePathText}")`),
      })
      .first();
    this.specBtn = this.specSection.locator('li.tab[data-type="spec"]').first();
    this.editBtn = this.specSection.getByText(/Edit specmatic.yaml/i);
    this.updateTab = this.specSection
      .locator('li.tab[data-type="spec"]')
      .first();
    this.saveBtn = this.specSection
      .locator('button[data-validate="/openapi"], button.savebtn.save')
      .first();
    this.openApiTabPage = new OpenAPISpecTabPage(this);
    this.editorContent = this.specSection.locator(".cm-content").first();
    this.editorScroller = this.specSection.locator(".cm-scroller").first();
    this.editorLines = this.specSection.locator(".cm-content .cm-line");
    this.contractTestTab = this.specSection
      .locator('li.tab[data-type="test"]')
      .first();
    this.alertMsg = page.locator(".alert-msg p");
    this.validationErrorBtn = page
      .locator(`[id*="${specName}"]`)
      .locator("button.bcc-errors-btn");
    this.errorContent = page
      .locator(`[id*="${specName}"]`)
      .locator(".bcc-errors-content");

    this.bccTestButton = this.specSection.locator("#bcc-test-btn");
    this.dictionaryGenerateButton = this.specSection
      .locator(
        'button.dictGen[data-busy-label="Generating dictionary..."]:has-text("Generate Dictionary")',
      )
      .first();
    this.alertMessage = this.page.locator(".alert-msg");
    this.alertDismissButton = this.alertMessage.locator("button");
    this.bccErrorToggle = this.specSection.locator(".bcc-errors-btn");
    this.bccErrorContent = this.specSection.locator(".bcc-errors-content");
    this.runSuitebtn = this.specSection.locator(".executeBtn");
    this.executionProgressDropdown = this.specSection.locator(
      ".execution-progress-panel",
    );
    this.saveSpecBtn = this.specSection.locator("button.savebtn.save");

    this.executionLog = this.executionProgressDropdown.locator(
      ".execution-progress-log",
    );
    this.alertContainer = page.locator(".alert-msg.error");
    this.alertTitle = this.alertContainer.locator("p");
    this.alertDescription = this.alertContainer.locator("pre");
    this.editorViewToggleButton = this.specSection
      .locator("#editor-view-toggle-btn")
      .first();
    this.specEditorHelper = new SpecEditorPage(page);
  }

  async openSpecTab() {
    return test.step("Open Spec tab", async () => {
      await this.openApiTabPage.openSpecTab(this.specBtn);
      await this.ensureEditorViewIfTogglePresent();
      await expect(this.editorContent).toBeVisible({ timeout: 15000 });
    });
  }

  private async ensureEditorViewIfTogglePresent() {
    const editorVisible = await this.editorContent.isVisible().catch(() => false);
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
        "switched-spec-tab-to-editor-view",
        this.eyes,
      );
    }

    await expect(this.editorContent).toBeVisible({ timeout: 15000 });
  }
  async openContractTestTab() {
    await test.step(`Open Contract Test tab`, async () => {
      await this.contractTestTab.waitFor({ state: "visible", timeout: 10000 });
      const isActive = await this.contractTestTab.getAttribute("data-active");
      if (isActive !== "true") {
        await this.contractTestTab.click({ force: true });
      }
      await takeAndAttachScreenshot(this.page, "contract-test-tab-opened");
    });
  }

  async verifyEndpointInContractTable(
    expectedPath: string,
    unexpectedPath?: string,
  ) {
    await test.step(`Verify endpoint visibility in contract table`, async () => {
      await this.openContractTestTab();
      await expect(this.page.locator("table#test")).toBeVisible({
        timeout: 15000,
      });

      await this.assertPathPresence(expectedPath, true);
      if (unexpectedPath) {
        await this.assertPathPresence(unexpectedPath, false);
      }
    });
  }

  private async assertPathPresence(path: string, shouldBePresent: boolean) {
    const cell = this.page.locator(
      `table#test tbody td[data-key="path"][data-value="${path}"]`,
    );
    if (shouldBePresent) {
      await expect(cell.first()).toBeVisible({ timeout: 10000 });
    } else {
      await expect(cell).toHaveCount(0);
    }
    const status = shouldBePresent ? "present" : "absent";
    await takeAndAttachScreenshot(
      this.page,
      `path-${path.replace(/\//g, "")}-${status}`,
      this.eyes,
    );
  }

  async editSpecFile(searchText: string, replaceText: string) {
    await test.step(`Edit spec file on disk: ${searchText} -> ${replaceText}`, async () => {
      const content = this.readSpecFile();

      if (!content.includes(searchText)) {
        throw new Error(`Text '${searchText}' not found in spec file.`);
      }

      const updatedContent = content.replace(searchText, replaceText);
      this.writeSpecFile(updatedContent);

      await this.verifyTextHighlightedInEditor(replaceText.trim());
    });
  }

  async editSpecInEditor(searchText: string, replaceText: string) {
    await this.editSpecInEditorByOccurrence(searchText, replaceText, 0);
  }

  async editSpecInEditorByOccurrence(
    searchText: string,
    replaceText: string,
    occurrenceIndex: number,
  ) {
    await test.step(`Edit spec in editor: '${searchText}' -> '${replaceText}'`, async () => {
      const content = this.editorContent;
      const scroller = this.editorScroller;
      const lines = this.editorLines;

      await expect(content).toBeVisible({ timeout: 10000 });

      // Phase 1: scroll .cm-scroller to bottom so CodeMirror renders all lines
      await this.specEditorHelper.loadFullEditorDocument(scroller);
      await scroller.evaluate((el) => {
        el.scrollTop = 0;
      });
      await this.page.waitForTimeout(200);

      // Phase 2: try the CodeMirror API to jump directly to the term
      const foundByApi =
        await this.specEditorHelper.focusTermUsingCodeMirrorApi(
          content,
          searchText,
        );

      // Phase 3: if the API didn't work, manually scroll to find the line
      if (!foundByApi) {
        await this.specEditorHelper.scrollEditorToFindTerm(
          content,
          scroller,
          lines,
          searchText,
        );
      }

      const matchingLines = lines.filter({ hasText: searchText });
      const matchCount = await matchingLines.count();
      if (matchCount <= occurrenceIndex) {
        throw new Error(
          `Could not find occurrence ${occurrenceIndex + 1} of '${searchText}' in the spec editor`,
        );
      }

      const targetLine = matchingLines.nth(occurrenceIndex);
      await expect(targetLine).toBeVisible({ timeout: 10000 });

      const originalText = await targetLine.innerText();
      const leadingSpaces = originalText.match(/^\s*/)?.[0] ?? "";

      await targetLine.scrollIntoViewIfNeeded();
      await targetLine.click();

      // Home twice: first Home moves past soft indent, second goes to column 0
      await this.page.keyboard.press("Home");
      await this.page.keyboard.press("Home");
      await this.page.keyboard.press("Shift+End");
      await this.page.keyboard.press("Backspace");
      await this.page.keyboard.type(leadingSpaces + replaceText.trim());

      const safeFileName = replaceText.trim().replace(/[^a-zA-Z0-9]/g, "-");
      await takeAndAttachScreenshot(
        this.page,
        `spec-editor-edit-${safeFileName}`,
        this.eyes,
      );
    });
  }

  async deleteSpecLinesInEditor(searchText: string, lineCount: number = 1) {
    await test.step(`Delete ${lineCount} spec line(s) starting with '${searchText}'`, async () => {
      const lines = this.specSection.locator(".cm-content .cm-line");
      const editorContent = this.editorContent;
      await expect(lines.first()).toBeVisible({ timeout: 10000 });
      await editorContent.click();
      await this.page.keyboard.press("Control+End");
      await this.page.waitForTimeout(300);
      await this.page.keyboard.press("Control+Home");
      await this.page.waitForTimeout(200);

      const targetLine = lines.filter({ hasText: searchText }).first();
      await expect(targetLine).toBeVisible({ timeout: 10000 });
      await targetLine.scrollIntoViewIfNeeded();
      await targetLine.click();

      await this.page.keyboard.press("Home");
      for (let i = 1; i < lineCount; i++) {
        await this.page.keyboard.press("Shift+ArrowDown");
      }
      await this.page.keyboard.press("Shift+End");

      await this.page.keyboard.press("Shift+Delete");

      const safeFileName = searchText.replace(/[^a-zA-Z0-9]/g, "-");
      await takeAndAttachScreenshot(
        this.page,
        `delete-spec-block-${safeFileName}`,
        this.eyes,
      );
    });
  }

  private async verifyTextHighlightedInEditor(text: string) {
    await test.step(`Visual evidence: highlight '${text}' in editor`, async () => {
      await expect(this.editorContent).toBeVisible({ timeout: 10000 });
      await this.editorContent.click();

      await this.page.keyboard.press("Control+f");
      await this.page.keyboard.type(text);
      await this.page.keyboard.press("Enter");

      const safeFileName = text.replace(/[^a-zA-Z0-9]/g, "-");
      await takeAndAttachScreenshot(
        this.page,
        `edit-highlight-${safeFileName}`,
        this.eyes,
      );

      await this.page.keyboard.press("Escape");
    });
  }

  private writeSpecFile(content: string) {
    const fs = require("fs");
    const nodePath = require("path");
    const specFilePath = nodePath.join(
      process.cwd(),
      "specmatic-studio-demo",
      "specs",
      this.specName!,
    );
    fs.writeFileSync(specFilePath, content, "utf-8");
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

  async clickSaveOpenApi() {
    await expect(this.saveBtn).toBeVisible({ timeout: 5000 });
    await expect(this.saveBtn).toBeEnabled({ timeout: 5000 });

    await this.saveBtn.scrollIntoViewIfNeeded();
    console.log("\tScrolled Save button into view");

    await this.saveBtn.click({ force: true });
    await takeAndAttachScreenshot(this.page, "save-clicked", this.eyes);
    return this.saveBtn;
  }

  async saveSpecAndAssertSuccessDialog() {
    await test.step("Save spec and verify success dialog", async () => {
      await this.clickSaveOpenApi();

      const saveAlert = this.page.locator(
        "#alert-container .alert-msg.success",
      );
      await expect(saveAlert).toContainText(/Contents saved/i, {
        timeout: 10000,
      });

      await takeAndAttachScreenshot(this.page, "spec-saved-successfully");

      await saveAlert.locator("button").click();
      await expect(saveAlert).toBeHidden({ timeout: 5000 });
    });
  }

  private async scrollEditorToRevealAllLines() {
    await this.editorContent.click();

    await this.page.keyboard.press("Control+End");
    await this.page.waitForTimeout(400);

    await this.page.keyboard.press("Control+Home");
    await this.page.waitForTimeout(200);
    console.log(
      "\tScrolled editor to reveal all lines (CodeMirror lazy-load workaround)",
    );
  }

  async editSpec(edits: Edit[]) {
    await this.openSpecTab();
    await expect(this.editorLines.first()).toBeVisible({ timeout: 10000 });
    await this.scrollEditorToRevealAllLines();

    for (const [index, edit] of edits.entries()) {
      await this.applyKeyboardEdit(edit, index);
    }
  }

  private async applyKeyboardEdit(edit: Edit, index: number) {
    let target = this.editorLines;

    if (edit.current.mode === "exact") {
      target = target.filter({ hasText: edit.current.value });
    } else if (edit.current.mode === "keyOnly") {
      target = target.filter({
        hasText: new RegExp(`^\\s*${edit.current.key}\\s*:`),
      });
    }

    const line = target.first();
    await expect(line).toBeVisible({ timeout: 10000 });

    const originalText = await line.innerText();
    const leadingSpaces = originalText.match(/^\s*/)?.[0] ?? "";

    await line.scrollIntoViewIfNeeded();
    await line.click();
    await this.page.keyboard.press("Home");
    await this.page.keyboard.press("Home");
    await this.page.keyboard.press("Shift+End");
    await this.page.keyboard.press("Backspace");
    await this.page.keyboard.type(leadingSpaces + edit.changeTo);

    await takeAndAttachScreenshot(
      this.page,
      `spec-edit-line-${index + 1}`,
      this.eyes,
    );
  }

  async getAlertText() {
    return await this.alertMsg.innerText();
  }

  async expandAndGetValidationError() {
    if (
      (await this.validationErrorBtn.getAttribute("aria-expanded")) === "false"
    ) {
      await this.validationErrorBtn.click();
      await takeAndAttachScreenshot(this.page, "error expanded");
    }
    return await this.errorContent.innerText();
  }

  async runBackwardCompatibilityTest() {
    await this.bccTestButton.click();
    await this.alertMessage.waitFor({ state: "visible", timeout: 5000 });
    await takeAndAttachScreenshot(
      this.page,
      "backward compatability passed",
      this.eyes,
    );
  }

  async getAlertMessageText(): Promise<string> {
    return (await this.alertMessage.locator("pre").innerText()).trim();
  }

  async getAlertTitleText(): Promise<string> {
    return (await this.alertMessage.locator("p").innerText()).trim();
  }

  async getBackwardCompatibilityResult(): Promise<BackwardCompatibilityResult> {
    const title = await this.getAlertTitleText();
    const message = await this.getAlertMessageText();
    const counts = this.parseBackwardCompatibilityCounts(message);

    return {
      title,
      message,
      ...counts,
    };
  }

  async dismissAlert() {
    const visibleAlert = this.page
      .locator("#alert-container .alert-msg:visible")
      .first();
    const isVisible = await visibleAlert.isVisible().catch(() => false);

    if (!isVisible) {
      return;
    }

    const dismissButton = visibleAlert.locator("button").first();
    const buttonVisible = await dismissButton.isVisible().catch(() => false);

    if (buttonVisible) {
      await dismissButton.click();
    }

    await expect(visibleAlert)
      .toBeHidden({ timeout: 5000 })
      .catch(() => {});
    await takeAndAttachScreenshot(this.page, "dismissing alert");
  }

  async generateDictionary() {
    await test.step("Generate dictionary", async () => {
      await expect(this.dictionaryGenerateButton).toBeVisible({
        timeout: 10000,
      });
      await expect(this.dictionaryGenerateButton).toBeEnabled({
        timeout: 10000,
      });
      await this.dictionaryGenerateButton.scrollIntoViewIfNeeded();
      await this.dictionaryGenerateButton.click({ force: true });
      await expect(
        this.page.locator("#alert-container .alert-msg.success"),
      ).toBeVisible({
        timeout: 10000,
      });
      await takeAndAttachScreenshot(
        this.page,
        "dictionary-generated",
        this.eyes,
      );
    });
  }

  async assertGeneratedDictionaryDialog(expectedDictionaryPath: string) {
    await test.step("Assert generated dictionary dialog", async () => {
      await expect(
        this.page.locator("#alert-container .alert-msg.success p"),
      ).toHaveText("Generated Dictionary", {
        timeout: 10000,
      });
      await expect(
        this.page.locator("#alert-container .alert-msg.success pre"),
      ).toHaveText(expectedDictionaryPath);
    });
  }

  async getEditorDocumentText(): Promise<string> {
    return this.specEditorHelper.getDocumentText(
      this.editorContent,
      this.editorScroller,
      this.editorLines,
    );
  }

  async replaceEditorDocumentText(updatedContent: string) {
    await test.step("Replace full editor content", async () => {
      await expect(this.editorContent).toBeVisible({ timeout: 10000 });
      await this.editorContent.click();
      await this.page.keyboard.press("ControlOrMeta+A");
      await this.page.keyboard.insertText(updatedContent);
      await this.page.waitForTimeout(300);
      await this.editorScroller.evaluate((el) => {
        el.scrollTop = 0;
      });
      await takeAndAttachScreenshot(
        this.page,
        "replaced-editor-document-content",
        this.eyes,
      );
    });
  }

  async toggleBccErrorSection(shouldExpand: boolean) {
    const toggleButton = await this.getBccErrorToggleButton();
    const isCurrentlyExpanded =
      (await toggleButton.getAttribute("aria-expanded")) === "true";

    if (
      (shouldExpand && !isCurrentlyExpanded) ||
      (!shouldExpand && isCurrentlyExpanded)
    ) {
      await toggleButton.click({ force: true });
      await takeAndAttachScreenshot(
        this.page,
        "expanding-error-section",
        this.eyes,
      );
    }

    if (shouldExpand) {
      await expect(toggleButton).toHaveAttribute("aria-expanded", "true");
      await expect(this.getBccIssuesPanel()).toHaveClass(/show/);
    } else {
      await expect(toggleButton).toHaveAttribute("aria-expanded", "false");
    }
  }

  async getBccErrorDetails() {
    const errorItemSelector = [
      ".error-item",
      ".error-item pre",
      ".card-body > button",
      ".card-body > div",
      ".card-body > *",
    ].join(", ");
    const buttonText = await this.getBccSummaryText();
    const errorText = (
      await this.bccErrorContent.locator(errorItemSelector).allInnerTexts()
    )
      .map((text) => text.trim())
      .filter(
        (text, index, items) =>
          text.length > 0 && items.indexOf(text) === index,
      );

    return {
      summary: buttonText,
      details: errorText,
    };
  }

  async assertBccErrorNavigation(expectedLineText: string) {
    await test.step(`Click backward compatibility error and verify navigation to '${expectedLineText}'`, async () => {
      const summaryButton = await this.getBccErrorToggleButton();
      const targetLine = this.editorLines
        .filter({ hasText: expectedLineText })
        .first();

      await summaryButton.click({ force: true });

      await expect(targetLine).toBeVisible({ timeout: 10000 });

      await takeAndAttachScreenshot(
        this.page,
        "bcc-error-navigation",
        this.eyes,
      );
    });
  }

  async assertBccErrorRowNavigation(
    expectedRowText: string,
    expectedLineText: string,
  ) {
    await test.step(`Expand backward compatibility summary and click row '${expectedRowText}'`, async () => {
      await this.toggleBccErrorSection(true);

      const errorRow = this.getBccIssuesTableRows()
        .filter({ hasText: expectedRowText })
        .first();
      await expect(errorRow).toBeVisible({ timeout: 10000 });
      await errorRow.click({ force: true });

      const targetLine = this.editorLines
        .filter({ hasText: expectedLineText })
        .first();
      await expect(targetLine).toBeVisible({ timeout: 10000 });

      await takeAndAttachScreenshot(
        this.page,
        "bcc-error-row-navigation",
        this.eyes,
      );
    });
  }

  async getBccErrorItemCount(): Promise<number> {
    await this.toggleBccErrorSection(true);
    return await this.getBccIssuesTableRows().count();
  }

  async assertBccIssuesTableVisible(expectedRowCount?: number) {
    await test.step("Expand backward compatibility issues table", async () => {
      await this.toggleBccErrorSection(true);

      const table = this.getBccIssuesPanel().locator("table.rulesTable");
      await expect(table).toBeVisible({ timeout: 10000 });

      if (expectedRowCount !== undefined) {
        await expect(this.getBccIssuesTableRows()).toHaveCount(
          expectedRowCount,
        );
      }
    });
  }

  async getBccIssueRows(): Promise<BackwardCompatibilityIssueRow[]> {
    await this.toggleBccErrorSection(true);

    return await this.getBccIssuesTableRows().evaluateAll((rows) =>
      rows.map((row) => ({
        rule:
          row
            .querySelector('[data-key="ruleId"], [data-key="rule"]')
            ?.textContent?.trim() ?? "",
        fieldPath:
          row
            .querySelector('[data-key="breadCrumb"], [data-key="field_path"]')
            ?.textContent?.trim() ?? "",
        reason:
          row
            .querySelector('[data-key="details"], [data-key="reason"]')
            ?.textContent?.trim() ?? "",
      })),
    );
  }

  async assertBccIssueRowsNavigate(
    expectedRows: Array<{
      fieldPath?: string;
      expectedLineText: string;
      reason: string;
    }>,
  ) {
    await this.toggleBccErrorSection(true);

    for (const expectedRow of expectedRows) {
      await test.step(`Click issue row '${expectedRow.reason}' and verify '${expectedRow.expectedLineText}'`, async () => {
        let row = this.getBccIssuesTableRows().filter({
          hasText: expectedRow.reason,
        });

        if (expectedRow.fieldPath) {
          row = row.filter({ hasText: expectedRow.fieldPath });
        }

        const targetRow = row.first();
        await expect(targetRow).toBeVisible({ timeout: 10000 });
        const jumpIcon = targetRow.locator(".breadCrumbJumpIcon").first();
        const hasJumpIcon = (await jumpIcon.count()) > 0;
        const jumpTarget = hasJumpIcon
          ? jumpIcon
          : targetRow
              .locator('[data-key="breadCrumb"], [data-key="field_path"]')
              .first();
        await expect(jumpTarget).toBeVisible({ timeout: 10000 });
        await jumpTarget.click({ force: true });

        const targetLine = this.editorLines
          .filter({ hasText: expectedRow.expectedLineText })
          .first();
        await expect(targetLine).toBeVisible({ timeout: 10000 });
      });
    }

    await takeAndAttachScreenshot(
      this.page,
      "bcc-multi-row-navigation",
      this.eyes,
    );
  }

  private getSpecFilePath(): string {
    const nodePath = require("path");
    return nodePath.join(
      process.cwd(),
      "specmatic-studio-demo",
      "specs",
      this.specName!,
    );
  }

  specFileContains(text: string): boolean {
    const fs = require("fs");
    const filePath = this.getSpecFilePath();
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      return content.includes(text);
    } catch (error) {
      console.error(`\tError checking spec file content: ${error}`);
      return false;
    }
  }

  async navigateToSpec(specName: string) {
    await test.step(`Maps to spec: ${specName}`, async () => {
      await this.gotoHomeAndOpenSidebar();
      await this.sideBar.selectSpec(specName);
      // You can even include opening the tab if it's always required
      await this.openSpecTab();
    });
  }

  async clickRunSuite() {
    console.log("Clicked Run suite");
    await this.runSuitebtn.click();
    await takeAndAttachScreenshot(this.page, "clicked-run-suite");
  }

  async waitForExecutionToComplete(
    pollIntervalMs: number = 3000,
    timeout: number = 60000,
  ) {
    await test.step(`Wait for execution to complete (poll every ${pollIntervalMs}ms, timeout: ${timeout}ms)`, async () => {
      const dropdown = this.executionProgressDropdown;
      await expect(dropdown).toBeVisible({ timeout: 15000 });

      const initialState = await dropdown.getAttribute("data-state");
      console.log(`\tInitial execution state: '${initialState}'`);

      if (initialState !== "running") {
        console.log(
          "\tExecution is already in a terminal state, skipping the running-state wait and treating it as completed",
        );
      } else {
        console.log("\tExecution is running — polling until it completes...");
      }

      await expect
        .poll(
          async () => {
            const state = await dropdown.getAttribute("data-state");
            console.log(`\t[poll] data-state = '${state}'`);
            return state;
          },
          {
            intervals: [pollIntervalMs],
            timeout,
            message: `Execution did not reach a terminal state within ${timeout}ms`,
          },
        )
        .not.toBe("running");

      const finalState = await dropdown.getAttribute("data-state");
      console.log(`\tExecution completed with state: '${finalState}'`);
      await takeAndAttachScreenshot(
        this.page,
        `execution-completed-state-${finalState}`,
      );
    });
  }

  async expandExecutionProgressDropdown() {
    await this.executionProgressDropdown.click();
    await takeAndAttachScreenshot(
      this.page,
      "expanded-execution-progress-dropdown",
    );
  }

  async clickSaveAfterEdit() {
    console.log("Saved new spec");
    await test.step("Click Save button after editing spec", async () => {
      await this.saveSpecBtn.waitFor({ state: "visible", timeout: 5000 });
      await this.saveSpecBtn.click();
      const saveAlert = this.page.locator(
        "#alert-container .alert-msg.success",
      );
      await expect(saveAlert).toContainText(/Contents saved/i, {
        timeout: 10000,
      });

      await takeAndAttachScreenshot(this.page, "spec-saved-successfully");

      await saveAlert.locator("button").click();

      await expect(saveAlert).toBeHidden({ timeout: 5000 });
    });
  }

  async verifyCompatibilityScenario(scenario: {
    oldText: string;
    newText: string;
  }) {
    await test.step(`Scenario: ${scenario.oldText} -> ${scenario.newText}`, async () => {
      if (scenario.newText === "") {
        await this.deleteSpecLinesInEditor(scenario.oldText, 1);
      } else {
        await this.editSpecInEditor(scenario.oldText, scenario.newText);
      }

      await this.runBackwardCompatibilityTest();

      const result = await this.getBackwardCompatibilityResult();
      expect(result.title).toBe("Backward Compatibility Check Complete");
      expect(result.passed).toBeGreaterThan(0);
      expect(result.total).toBe(result.failed + result.passed);

      await this.dismissAlert();
    });
  }

  async verifyIncompatibilityScenario(
    scenario: {
      oldText: string;
      newText: string;
      lineCount: number;
      expectedDialogCounts?: {
        failed: number;
        passed: number;
        total: number;
      };
      expectedRowText?: string;
      expectedLineText?: string;
    },
    reload: boolean = true,
  ) {
    // 1. Preconditions: Get back to a clean state (skipped when batching without reload)
    if (reload) {
      await test.step("Preconditions for the test", async () => {
        await this.page.reload();
        await this.navigateToSpec(this.specName!);
      });
    }

    await test.step(`Incompatibility Check for: ${scenario.oldText}`, async () => {
      if (scenario.lineCount > 0) {
        await this.deleteSpecLinesInEditor(
          scenario.oldText,
          scenario.lineCount,
        );
      } else if (scenario.newText !== "") {
        await this.editSpecInEditor(scenario.oldText, scenario.newText);
      }

      await this.runBackwardCompatibilityTest();

      const result = await this.getBackwardCompatibilityResult();
      expect.soft(result.title).toBe("Backward Compatibility Check Complete");
      expect.soft(result.failed).toBeGreaterThan(0);
      expect.soft(result.total).toBeGreaterThan(result.passed);

      if (scenario.expectedDialogCounts) {
        expect.soft(result.failed).toBe(scenario.expectedDialogCounts.failed);
        expect.soft(result.passed).toBe(scenario.expectedDialogCounts.passed);
        expect.soft(result.total).toBe(scenario.expectedDialogCounts.total);
      }

      await this.dismissAlert();

      await this.toggleBccErrorSection(true);
      expect.soft(await this.getBccErrorItemCount()).toBeGreaterThan(0);

      if (scenario.expectedRowText && scenario.expectedLineText) {
        await this.assertBccErrorRowNavigation(
          scenario.expectedRowText,
          scenario.expectedLineText,
        );
      } else if (scenario.expectedLineText) {
        await this.assertBccErrorNavigation(scenario.expectedLineText);
      }
    });
  }

  private parseBackwardCompatibilityCounts(message: string) {
    const match =
      message.match(
        /(\d+)\s+failed,\s*(\d+)\s+passed\s+of\s+(\d+)\s+scenarios/i,
      ) ?? message.match(/(\d+)\s+passed\s+of\s+(\d+)\s+scenarios/i);

    if (!match) {
      throw new Error(
        `Could not parse backward compatibility result counts from: ${message}`,
      );
    }

    if (match.length === 4) {
      return {
        failed: Number(match[1]),
        passed: Number(match[2]),
        total: Number(match[3]),
      };
    }

    return {
      failed: 0,
      passed: Number(match[1]),
      total: Number(match[2]),
    };
  }

  private async getBccErrorToggleButton() {
    const namedButton = this.specSection.locator(
      "button.issues-btn, button.bcc-errors-btn",
    );

    if ((await namedButton.count()) > 0) {
      return namedButton.first();
    }

    return this.bccErrorToggle;
  }

  private async getBccSummaryText(): Promise<string> {
    const namedButton = this.specSection.locator(
      "button.issues-btn .text, button.bcc-errors-btn .text, button.issues-btn, button.bcc-errors-btn",
    );

    if ((await namedButton.count()) > 0) {
      return (await namedButton.first().innerText()).trim();
    }

    const buttonText = (await this.bccErrorToggle.innerText()).trim();
    if (buttonText.length > 0) {
      return buttonText;
    }

    return "";
  }

  private getBccIssuesPanel() {
    return this.specSection
      .locator(".issues-panel-content, .bcc-errors-content")
      .first();
  }

  private getBccIssuesTableRows() {
    return this.getBccIssuesPanel().locator("table.rulesTable tbody tr");
  }
}
