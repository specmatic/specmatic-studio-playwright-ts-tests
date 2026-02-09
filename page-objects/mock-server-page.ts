import { OpenAPISpecTabPage } from "./openapi-spec-tab-page";
import { Locator, type TestInfo, Page } from "@playwright/test";
import { BasePage } from "./base-page";

export class MockServerPage extends BasePage {
  private readonly openApiTabPage: OpenAPISpecTabPage;

  readonly specTree: Locator;
  readonly runMockServerTab: Locator;

  constructor(page: Page, testInfo?: TestInfo, eyes?: any) {
    super(page, testInfo, eyes);
    this.specTree = page.locator("#spec-tree");
    this.runMockServerTab = page.getByText(/Run mock server/i);
    this.openApiTabPage = new OpenAPISpecTabPage(this);
  }
  async openRunMockServerTab() {
    return this.openApiTabPage.openRunMockServerTab();
  }
}
