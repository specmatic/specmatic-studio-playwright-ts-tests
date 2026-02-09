import { Locator, expect, type TestInfo, Page } from "@playwright/test";
import { SideBarPage } from "./side-bar-page";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";

export class ServiceSpecConfigPage {
  readonly page: Page;
  readonly specTree: Locator;
  readonly sideBar: SideBarPage;
  readonly editBtn: Locator;
  readonly updateTab: Locator;
  readonly saveBtn: Locator;
  readonly testInfo?: TestInfo;
  readonly eyes?: any;

  constructor(page: Page, testInfo?: TestInfo, eyes?: any) {
    this.page = page;
    this.specTree = page.locator("#spec-tree");
    this.sideBar = new SideBarPage(page, testInfo, eyes);
    this.editBtn = page.getByText(/Edit specmatic.yaml/i);
    this.updateTab = page.locator('li.tab[data-type="spec"]').first();
    this.saveBtn = page.locator('button[data-validate="/openapi"]');
    this.testInfo = testInfo;
    this.eyes = eyes;
  }

  async selectConfig(configName: string) {
    await expect(this.specTree).toBeVisible({ timeout: 4000 });
    const configLocator = this.specTree.locator("text=" + configName);
    await configLocator.click({ force: true });
    await takeAndAttachScreenshot(
      this.page,
      "selected-config-screenshot",
      this.eyes,
    );
    return configLocator;
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

  async clickUpdateSpec() {
    if ((await this.updateTab.getAttribute("data-active")) !== "true") {
      await this.updateTab.click({ force: true });
    }
    await takeAndAttachScreenshot(
      this.page,
      "clicked-update-spec-screenshot",
      this.eyes,
    );
    return this.updateTab;
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
