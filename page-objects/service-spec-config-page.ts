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

  /**
   * @param expectedPath   The path that SHOULD be present (e.g. '/orders')
   * @param unexpectedPath The path that should NOT be present (e.g. '/ordres')
   */
  async verifyEndpointInContractTable(
    expectedPath: string,
    unexpectedPath?: string,
  ) {
    await test.step(`Verify endpoint '${expectedPath}' in contract test table`, async () => {
      await this.openContractTestTab();

      const table = this.page.locator("table#test");
      await expect(table).toBeVisible({ timeout: 15000 });
      console.log(`  Contract test table is visible`);

      const expectedCell = this.page.locator(
        `table#test tbody td[data-key="path"][data-value="${expectedPath}"]`,
      );
      await expect(expectedCell.first()).toBeVisible({ timeout: 10000 });
      console.log(`  ✓ Found expected path in contract table: ${expectedPath}`);

      await takeAndAttachScreenshot(
        this.page,
        `verified-contract-path-${expectedPath.replace(/\//g, "")}-present`,
        this.eyes,
      );

      if (unexpectedPath) {
        const unexpectedCell = this.page.locator(
          `table#test tbody td[data-key="path"][data-value="${unexpectedPath}"]`,
        );
        await expect(unexpectedCell).toHaveCount(0);
        console.log(`  ✓ Confirmed typo path is absent: ${unexpectedPath}`);

        await takeAndAttachScreenshot(
          this.page,
          `verified-contract-path-${unexpectedPath.replace(/\//g, "")}-absent`,
          this.eyes,
        );
      }

      console.log(`  ✓ Contract table path verification complete`);
    });
  }

  /**
   *
   * @param searchText  Exact string to find in the file (e.g. '  /ordres:')
   * @param replaceText Replacement string (e.g. '  /orders:')
   */
  async editSpecFile(searchText: string, replaceText: string) {
    await test.step(`Edit spec file: replace '${searchText}' with '${replaceText}'`, async () => {
      const fs = require("fs") as typeof import("fs");
      const nodePath = require("path") as typeof import("path");

      const specFilePath = nodePath.join(
        process.cwd(),
        "specmatic-studio-demo",
        "specs",
        this.specName!,
      );

      console.log(`\tReading spec file from: ${specFilePath}`);
      let content: string;
      try {
        content = fs.readFileSync(specFilePath, "utf-8");
      } catch (error) {
        throw new Error(
          `Could not read spec file at ${specFilePath}. Error: ${error}`,
        );
      }

      if (!content.includes(searchText)) {
        throw new Error(
          `Text '${searchText}' not found in spec file: ${specFilePath}`,
        );
      }

      const updatedContent = content.replace(searchText, replaceText);
      fs.writeFileSync(specFilePath, updatedContent, "utf-8");
      console.log(`\t✓ Spec file updated: '${searchText}' → '${replaceText}'`);

      await test.step(`Visual evidence: show '${replaceText.trim()}' highlighted in spec editor`, async () => {
        const editorContent = this.specSection.locator(".cm-content");
        await expect(editorContent).toBeVisible({ timeout: 10000 });
        await editorContent.click();

        await this.page.keyboard.press("Control+f");
        await this.page.waitForTimeout(500);
        await this.page.keyboard.type(replaceText.trim());
        await this.page.waitForTimeout(800);

        await takeAndAttachScreenshot(
          this.page,
          `visual-evidence-spec-file-edit-${replaceText.trim().replace(/[^a-zA-Z0-9]/g, "-")}`,
          this.eyes,
        );

        await this.page.keyboard.press("Escape");
        await this.page.waitForTimeout(200);

        console.log(
          `\t📸 Visual evidence screenshot taken for '${replaceText.trim()}'`,
        );
      });
    });
  }

  async clickEditConfig() {
    await this.editBtn.click({ force: true });
    await takeAndAttachScreenshot(this.page, "clicked-edit-config", this.eyes);
    return this.editBtn;
  }

  async clickSaveOpenApi() {
    await expect(this.saveBtn).toBeVisible({ timeout: 5000 });
    await expect(this.saveBtn).toBeEnabled({ timeout: 5000 });
    // Wait for the button to not be covered by any overlay
    const saveBtnSelector = 'button[data-validate="/openapi"]';
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
      saveBtnSelector,
      { timeout: 5000 },
    );
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
      let target = this.editorLines;
      const pattern = edit.current;

      if (pattern.mode === "exact") {
        target = target.filter({ hasText: pattern.value });
      } else if (pattern.mode === "keyOnly") {
        const re = new RegExp(`^\\s*${pattern.key}\\s*:`);
        target = target.filter({ hasText: re });
      }

      const line = target.first();
      await expect(line).toBeVisible({ timeout: 10000 });

      const originalText = await line.innerText();
      const leadingSpaces = originalText.match(/^\s*/)?.[0] ?? "";

      console.log(
        `\tProcessing edit #${index + 1}: Indentation length: ${leadingSpaces.length}`,
      );

      await line.scrollIntoViewIfNeeded();
      await line.click();

      await this.page.keyboard.press("Home");
      await this.page.keyboard.press("Home");

      await this.page.keyboard.press("Shift+End");
      await this.page.keyboard.press("Backspace");

      await this.page.keyboard.type(leadingSpaces + edit.changeTo);

      await takeAndAttachScreenshot(
        this.page,
        `edited-spec-line-${index + 1}`,
        this.eyes,
      );

      console.log(`\tLine #${index + 1} updated successfully.`);
    }
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
}
