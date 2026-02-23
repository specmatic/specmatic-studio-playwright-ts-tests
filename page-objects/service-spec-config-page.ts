import { OpenAPISpecTabPage } from "./openapi-spec-tab-page";
import { Locator, expect, type TestInfo, Page, test } from "@playwright/test";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";
import { BasePage } from "./base-page";

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
    this.alertMsg = page.locator(".alert-msg.error");
    this.validationErrorBtn = page.locator("button.bcc-errors-btn");
    this.errorContent = page.locator(".bcc-errors-content");

    this.bccTestButton = this.specSection.locator("#bcc-test-btn");
    this.alertMessage = this.page.locator(".alert-msg.error");
    this.alertDismissButton = this.alertMessage.locator("button");
    this.bccErrorToggle = this.specSection.locator(".bcc-errors-btn");
    this.bccErrorContent = this.specSection.locator(".bcc-errors-content");
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
      await takeAndAttachScreenshot(
        this.page,
        "contract-test-tab-opened",
        this.eyes,
      );
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

  private async verifyTextHighlightedInEditor(text: string) {
    await test.step(`Visual evidence: highlight '${text}' in editor`, async () => {
      const editorContent = this.specSection.locator(".cm-content");
      await expect(editorContent).toBeVisible({ timeout: 10000 });
      await editorContent.click();

      await this.page.keyboard.press("Control+f");
      await this.page.keyboard.type(text);
      await this.page.waitForTimeout(1000); // Allow time for scroll/highlight

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

    // Use a helper to ensure the button isn't obscured
    await this.waitForElementToBeClickable('button[data-validate="/openapi"]');

    await this.saveBtn.click({ force: true });
    await takeAndAttachScreenshot(this.page, "save-clicked", this.eyes);
    return this.saveBtn;
  }

  private async waitForElementToBeClickable(selector: string) {
    await this.page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const elementAtPoint = document.elementFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
        );
        return elementAtPoint === el || el.contains(elementAtPoint);
      },
      selector,
      { timeout: 5000 },
    );
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
    return await this.alertMsg.locator("pre").innerText();
  }

  async expandAndGetValidationError() {
    if (
      (await this.validationErrorBtn.getAttribute("aria-expanded")) === "false"
    ) {
      await this.validationErrorBtn.click();
      await takeAndAttachScreenshot(this.page, "error expanded", this.eyes);
    }
    return await this.errorContent.innerText();
  }

  async runBackwardCompatibilityTest() {
    await this.bccTestButton.click();
    await this.alertMessage.waitFor({ state: "visible", timeout: 5000 });
    await takeAndAttachScreenshot(this.page, "waiting for alert", this.eyes);
  }

  async getAlertMessageText(): Promise<string> {
    return (await this.alertMessage.locator("pre").innerText()).trim();
  }

  async dismissAlert() {
    await this.alertDismissButton.click();
    await this.alertMessage.waitFor({ state: "hidden" });
    await takeAndAttachScreenshot(this.page, "dismissing alert", this.eyes);
  }

  async toggleBccErrorSection(shouldExpand: boolean) {
    const isExpanded = await this.bccErrorToggle.getAttribute("aria-expanded");

    if (
      (shouldExpand && isExpanded === "false") ||
      (!shouldExpand && isExpanded === "true")
    ) {
      await this.bccErrorToggle.click();
      await takeAndAttachScreenshot(
        this.page,
        "expanding-error-setion",
        this.eyes,
      );
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
}
