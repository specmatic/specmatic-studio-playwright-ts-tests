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

export class ServiceSpecConfigPage extends BasePage {
  private readonly openApiTabPage: OpenAPISpecTabPage;
  readonly specTree: Locator;
  readonly specBtn: Locator;
  readonly editBtn: Locator;
  readonly updateTab: Locator;
  readonly saveBtn: Locator;
  private readonly specSection: Locator;
  private readonly contractTestTab: Locator;
  readonly editorLines: Locator;
  readonly alertMsg: Locator;
  readonly validationErrorBtn: Locator;
  readonly errorContent: Locator;
  private readonly bccTestButton: Locator;
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
  private readonly specEditorHelper: SpecEditorPage;

  constructor(page: Page, testInfo: TestInfo, eyes: any, specName: string) {
    super(page, testInfo, eyes, specName);
    this.specTree = page.locator("#spec-tree");
    this.specSection = page.locator(
      `xpath=//div[contains(@id,"${specName}") and @data-mode="spec"]`,
    );
    this.specBtn = page.locator('li.tab[data-type="spec"]').first();
    this.editBtn = this.specSection.getByText(/Edit specmatic.yaml/i);
    this.updateTab = this.specSection
      .locator('li.tab[data-type="spec"]')
      .first();
    this.saveBtn = this.specSection.locator('button[data-validate="/openapi"]');
    this.openApiTabPage = new OpenAPISpecTabPage(this);
    this.editorLines = this.specSection.locator(".cm-content .cm-line");
    this.contractTestTab = page.locator('li.tab[data-type="test"]').first();
    this.alertMsg = page.locator(".alert-msg p");
    this.validationErrorBtn = page
      .locator(`[id*="${this.specName}"]`)
      .locator("button.bcc-errors-btn");
    this.errorContent = page
      .locator(`[id*="${this.specName}"]`)
      .locator(".bcc-errors-content");

    this.bccTestButton = this.specSection.locator("#bcc-test-btn");
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
    this.specEditorHelper = new SpecEditorPage(page);
  }

  async openSpecTab() {
    return this.openApiTabPage.openSpecTab();
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
    await test.step(`Edit spec in editor: '${searchText}' -> '${replaceText}'`, async () => {
      const content = this.specSection.locator(".cm-content").first();
      const scroller = this.specSection.locator(".cm-scroller").first();
      const lines = this.specSection.locator(".cm-content .cm-line");

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

      const targetLine = lines.filter({ hasText: searchText }).first();
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
      await expect(lines.first()).toBeVisible({ timeout: 10000 });

      const editorContent = this.specSection.locator(".cm-content");
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
      const editorContent = this.specSection.locator(".cm-content");
      await expect(editorContent).toBeVisible({ timeout: 10000 });
      await editorContent.click();

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

  private async scrollEditorToRevealAllLines() {
    const editorContent = this.specSection.locator(".cm-content");
    await editorContent.click();

    await this.page.keyboard.press("Control+End");
    await this.page.waitForTimeout(400);

    await this.page.keyboard.press("Control+Home");
    await this.page.waitForTimeout(200);
    console.log(
      "\tScrolled editor to reveal all lines (CodeMirror lazy-load workaround)",
    );
  }

  async editSpec(edits: Edit[]) {
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

  async dismissAlert() {
    await this.alertDismissButton.click();
    await this.alertMessage.waitFor({ state: "hidden" });
    await takeAndAttachScreenshot(this.page, "dismissing alert");
  }

  async toggleBccErrorSection(shouldExpand: boolean) {
    const isExpanded = await this.bccErrorToggle.getAttribute("aria-expanded");

    if (
      (shouldExpand && isExpanded === "false") ||
      (!shouldExpand && isExpanded === "true")
    ) {
      await this.bccErrorToggle.click();
      await takeAndAttachScreenshot(this.page, "expanding-error-setion");
    }

    if (shouldExpand) {
      await expect(this.bccErrorContent).toHaveClass(/show/);
    }
  }

  async getBccErrorDetails() {
    const errorText = await this.bccErrorContent
      .locator(".error-item pre")
      .allTextContents();
    const buttonText = await this.bccErrorToggle.locator("span").innerText();

    return {
      summary: buttonText,
      details: errorText.map((t) => t.trim()),
    };
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
      await expect(dropdown).toHaveAttribute("data-state", "running", {
        timeout: 15000,
      });
      console.log("\tExecution is running — polling until it completes...");

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
            message: `Execution did not leave 'running' state within ${timeout}ms`,
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
      await takeAndAttachScreenshot(this.page, "save-button-clicked");
    });
  }
}
