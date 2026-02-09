import { Locator, expect, type TestInfo, Page } from "@playwright/test";
import { SideBarPage } from "./side-bar-page";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";

export class MockServerPage {
  readonly page: Page;
  readonly sideBar: SideBarPage;
  readonly specTree: Locator;
  readonly testInfo?: TestInfo;

  readonly eyes?: any;
  constructor(page: Page, testInfo?: TestInfo, eyes?: any) {
    this.page = page;
    this.sideBar = new SideBarPage(page, testInfo, eyes);
    this.specTree = page.locator("#spec-tree");
    this.testInfo = testInfo;
    this.eyes = eyes;
  }

  async selectSpec(specName: string) {
    await expect(this.specTree).toBeVisible({ timeout: 4000 });
    const specLocator = this.specTree.locator("text=" + specName);
    await expect(specLocator).toBeVisible({ timeout: 4000 });
    await specLocator.click({ force: true });
    if (this.testInfo) {
      await takeAndAttachScreenshot(this.page, "selected-spec-screenshot");
    }
    return specLocator;
  }

  async clickRunMockServer() {
    const mockBtn = this.page.getByText(/Run mock server/i);
    await mockBtn.click({ force: true });
    await takeAndAttachScreenshot(
      this.page,
      "clicked-run-mock-screenshot",
      this.eyes,
    );
    return mockBtn;
  }
}
