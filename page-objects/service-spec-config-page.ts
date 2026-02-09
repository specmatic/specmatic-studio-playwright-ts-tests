import { Locator, expect, type TestInfo, Page } from "@playwright/test";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";
import { BasePage } from "./base-page";

export class ServiceSpecConfigPage extends BasePage {
  readonly specTree: Locator;
  readonly editBtn: Locator;
  readonly updateTab: Locator;
  readonly saveBtn: Locator;

  constructor(page: Page, testInfo?: TestInfo, eyes?: any) {
    super(page, testInfo, eyes);
    this.specTree = page.locator("#spec-tree");
    this.editBtn = page.getByText(/Edit specmatic.yaml/i);
    this.updateTab = page.locator('li.tab[data-type="spec"]').first();
    this.saveBtn = page.locator('button[data-validate="/openapi"]');
  }

  async clickEditConfig() {
    await this.editBtn.click({ force: true });
    await takeAndAttachScreenshot(
      this.page,
      "clicked-edit-config-screenshot",
      this.eyes,
    );
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
    await takeAndAttachScreenshot(
      this.page,
      "save-clicked-screenshot",
      this.eyes,
    );
    return this.saveBtn;
  }
}
