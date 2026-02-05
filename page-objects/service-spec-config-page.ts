import { takeAndAttachScreenshot } from "../utils/screenshotUtils";
import { Page, Locator, expect, type TestInfo } from "@playwright/test";
import { SideBarPage } from "./side-bar-page";

export class ServiceSpecConfigPage {
  readonly page: Page;
  readonly sideBar: SideBarPage;
  readonly specTree: Locator;
  readonly testInfo?: TestInfo;

  constructor(page: Page, testInfo?: TestInfo) {
    this.page = page;
    this.sideBar = new SideBarPage(page);
    this.specTree = page.locator("#spec-tree");
    this.testInfo = testInfo;
  }

  async goto() {
    await this.page.goto("/");
    if (this.testInfo) {
      await takeAndAttachScreenshot(this.page, "app-loaded-screenshot");
    }
  }

  async ensureSidebarOpen() {
    await this.sideBar.ensureSidebarOpen();
    if (this.testInfo) {
      await takeAndAttachScreenshot(this.page, "sidebar-screenshot");
    }
  }

  async selectConfig(configName: string) {
    await expect(this.specTree).toBeVisible({ timeout: 4000 });
    const configLocator = this.specTree.locator("text=" + configName);
    await configLocator.click({ force: true });
    if (this.testInfo) {
      await takeAndAttachScreenshot(this.page, "selected-config-screenshot");
    }
    return configLocator;
  }

  async clickEditConfig() {
    const editBtn = this.page.getByText(/Edit specmatic.yaml/i);
    await editBtn.click({ force: true });
    if (this.testInfo) {
      await takeAndAttachScreenshot(
        this.page,
        "clicked-edit-config-screenshot",
      );
    }
    return editBtn;
  }

  async clickUpdateSpec() {
    const updateTab = this.page.locator('li.tab[data-type="spec"]').first();
    if ((await updateTab.getAttribute("data-active")) !== "true") {
      await updateTab.click({ force: true });
    }
    if (this.testInfo) {
      await takeAndAttachScreenshot(
        this.page,
        "clicked-update-spec-screenshot",
      );
    }
    return updateTab;
  }

  async clickSaveOpenApi() {
    const saveBtn = this.page.locator('button[data-validate="/openapi"]');
    await saveBtn.click({ force: true });
    if (this.testInfo) {
      await takeAndAttachScreenshot(this.page, "save-clicked-screenshot");
    }
    return saveBtn;
  }
}
