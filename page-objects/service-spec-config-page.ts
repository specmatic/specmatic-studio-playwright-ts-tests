import { OpenAPISpecTabPage } from "./openapi-spec-tab-page";
import { Locator, expect, type TestInfo, Page } from "@playwright/test";
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

  async editSpec(edits: Edit[]) {
    await expect(this.editorLines.first()).toBeVisible({ timeout: 10000 });

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
  }

  async toggleBccErrorSection(shouldExpand: boolean) {
    const isExpanded = await this.bccErrorToggle.getAttribute("aria-expanded");

    if (
      (shouldExpand && isExpanded === "false") ||
      (!shouldExpand && isExpanded === "true")
    ) {
      await this.bccErrorToggle.click();
    }

    // Wait for Bootstrap collapse animation to finish
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
