import { type TestInfo, Locator, Page } from "@playwright/test";
import { SideBarPage } from "./side-bar-page";
import { takeAndAttachScreenshot } from "../utils/screenshotUtils";

export class BasePage {
  readonly page: Page;
  readonly sideBar: SideBarPage;
  readonly testInfo?: TestInfo;
  readonly eyes?: any;

  constructor(page: Page, testInfo?: TestInfo, eyes?: any) {
    this.page = page;
    this.testInfo = testInfo;
    this.eyes = eyes;
    this.sideBar = new SideBarPage(page, testInfo, eyes);
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
  }

  async clickButtonByText(text: string) {
    const btn = this.page.getByText(new RegExp(text, "i"));
    await btn.click({ force: true });
    return btn;
  }

  async fillInputByPlaceholder(placeholder: string, value: string) {
    const input = this.page.getByPlaceholder(placeholder);
    await input.fill(value);
    return input;
  }

  async fillInputByRole(role: string, value: string) {
    const input = this.page.getByRole(role as any);
    await input.fill(value);
    return input;
  }
}
