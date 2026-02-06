import { takeAndAttachScreenshot } from "../utils/screenshotUtils";
import { Page, Locator, expect, type TestInfo } from "@playwright/test";
import { SideBarPage } from "./side-bar-page";

export class ExampleGenerationPage {
  readonly page: Page;
  readonly specTree: Locator;
  readonly sideBar: SideBarPage;
  readonly exampleGenerationTab: Locator;
  readonly generateExamplesBtn: Locator;
  readonly validExamplesTable: Locator;
  readonly invalidExamplesTable: Locator;
  readonly downloadExamplesBtn: Locator;
  readonly testInfo?: TestInfo;
  readonly eyes?: any;

  constructor(page: Page, testInfo?: TestInfo, eyes?: any) {
    this.page = page;
    this.specTree = page.locator("#spec-tree");
    this.sideBar = new SideBarPage(page);
    this.exampleGenerationTab = page.locator("#example-generation-tab");
    this.generateExamplesBtn = page.locator("button#generate-examples");
    this.validExamplesTable = page.locator("#valid-examples-table");
    this.invalidExamplesTable = page.locator("#invalid-examples-table");
    this.downloadExamplesBtn = page.locator("button#download-examples");
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
    if (this.testInfo) {
      await takeAndAttachScreenshot(this.page, "sidebar-screenshot");
    }
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

  async clickGenerateExamples() {
    const examplesBtn = this.page.getByText(/Generate valid examples/i);
    await examplesBtn.click({ force: true });
    if (this.testInfo) {
      await takeAndAttachScreenshot(
        this.page,
        "clicked-generate-examples-screenshot",
      );
    }
    return examplesBtn;
  }
}
