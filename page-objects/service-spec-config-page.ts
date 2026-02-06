import { Page, Locator, expect, type TestInfo } from "@playwright/test";
import { SideBarPage } from "./side-bar-page";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";

export class ServiceSpecConfigPage {
  readonly page: Page;
  readonly sideBar: SideBarPage;
  readonly specTree: Locator;
  readonly testInfo?: TestInfo;
  readonly eyes?: any;

  constructor(page: Page, testInfo?: TestInfo, eyes?: any) {
    this.page = page;
    this.sideBar = new SideBarPage(page);
    this.specTree = page.locator("#spec-tree");
    this.testInfo = testInfo;
    this.eyes = eyes;
  }

  async goto() {
    await this.page.goto("/");
    await takeAndAttachScreenshot(
      this.page,
      "app-loaded-screenshot",
      this.eyes,
    );
  }

  async ensureSidebarOpen() {
    await this.sideBar.ensureSidebarOpen();
    await takeAndAttachScreenshot(this.page, "sidebar-screenshot", this.eyes);
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
    const editBtn = this.page.getByText(/Edit specmatic.yaml/i);
    await editBtn.click({ force: true });
    await takeAndAttachScreenshot(
      this.page,
      "clicked-edit-config-screenshot",
      this.eyes,
    );
    return editBtn;
  }

  async clickUpdateSpec() {
    const updateTab = this.page.locator('li.tab[data-type="spec"]').first();
    if ((await updateTab.getAttribute("data-active")) !== "true") {
      await updateTab.click({ force: true });
    }
    await takeAndAttachScreenshot(
      this.page,
      "clicked-update-spec-screenshot",
      this.eyes,
    );
    return updateTab;
  }

  async clickSaveOpenApi() {
    const saveBtn = this.page.locator('button[data-validate="/openapi"]');
    await saveBtn.click({ force: true });
    await takeAndAttachScreenshot(
      this.page,
      "save-clicked-screenshot",
      this.eyes,
    );
    return saveBtn;
  }
}
