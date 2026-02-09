import { Locator } from "@playwright/test";
import { BasePage } from "./base-page";

/**
 * Helper for OpenAPI Spec Tab actions, delegates tab opening to a BasePage instance.
 */
export class OpenAPISpecTabPage {
  private readonly basePage: BasePage;

  constructor(basePage: BasePage) {
    this.basePage = basePage;
  }

  async openSpecTab(tabLocator?: Locator) {
    const locator =
      tabLocator ?? ((this.basePage as any).specBtn as Locator | undefined);
    return this.basePage["openTab"](locator, "open-spec-tab");
  }

  async openExampleGenerationTab(tabLocator?: Locator) {
    const locator =
      tabLocator ??
      ((this.basePage as any).generateExamplesBtn as Locator | undefined);
    return this.basePage["openTab"](
      locator,
      "open-generate-examples-tab",
    );
  }

  async openRunMockServerTab(tabLocator?: Locator) {
    const locator =
      tabLocator ??
      ((this.basePage as any).runMockServerTab as Locator | undefined);
    return this.basePage["openTab"](locator, "open-run-mock-server-tab");
  }

  async openExecuteContractTestsTab(tabLocator?: Locator) {
    const locator =
      tabLocator ?? ((this.basePage as any).testBtn as Locator | undefined);
    return this.basePage["openTab"](
      locator,
      "open-execute-contract-tests-tab",
    );
  }
}
