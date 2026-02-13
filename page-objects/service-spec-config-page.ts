import { OpenAPISpecTabPage } from "./openapi-spec-tab-page";
import { Locator, expect, type TestInfo, Page } from "@playwright/test";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";
import { BasePage } from "./base-page";

export class ServiceSpecConfigPage extends BasePage {
  private readonly openApiTabPage: OpenAPISpecTabPage;
  readonly specTree: Locator;
  readonly specBtn: Locator;
  readonly editBtn: Locator;
  readonly updateTab: Locator;
  readonly saveBtn: Locator;
  private readonly specSection: Locator;

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
}
