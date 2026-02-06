import { takeAndAttachScreenshot } from "../utils/screenshotUtils";
import { Page, Locator, expect, type TestInfo } from "@playwright/test";
import { SideBarPage } from "./side-bar-page";

export class ApiContractPage {
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
    await takeAndAttachScreenshot(
      this.page,
      "sidebar-opened-screenshot",
      this.eyes,
    );
  }

  async selectSpec(specName: string) {
    await expect(this.specTree).toBeVisible({ timeout: 4000 });
    const specLocator = this.specTree.locator("text=" + specName);
    await expect(specLocator).toBeVisible({ timeout: 4000 });
    await specLocator.click({ force: true });
    await takeAndAttachScreenshot(
      this.page,
      "selected-spec-screenshot",
      this.eyes,
    );
    return specLocator;
  }

  async clickExecuteContractTests() {
    const testBtn = this.page.getByText(/Execute contract tests/i);
    await expect(testBtn).toBeVisible({ timeout: 4000 });
    await testBtn.click({ force: true });
    await takeAndAttachScreenshot(
      this.page,
      "clicked-execute-tests-screenshot",
      this.eyes,
    );
    return testBtn;
  }
}
