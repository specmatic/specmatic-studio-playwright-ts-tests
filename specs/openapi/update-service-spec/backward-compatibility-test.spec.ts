import { test } from "../../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC_BACKWARD_COMPATIBILITY } from "../../specNames";
import { ServiceSpecConfigPage } from "../../../page-objects/service-spec-config-page";
import { Page } from "playwright/test";

const SCENARIOS = [
  {
    oldText: "summary: Create a new product",
    newText: "summary: Create product",
  },
];

test.describe("API Specification", () => {
  test(
    "Backward Compatibility Test",
    { tag: ["@spec", "@bccTest", "@eyes"] },
    async ({ page, eyes }, testInfo) => {
      const configPage = await setupConfigPage(page, testInfo, eyes);

      await test.step("Run the summary-edit backward compatibility flow and verify mixed results", async () => {
        for (const scenario of SCENARIOS) {
          await configPage.verifyCompatibilityScenario(scenario);
        }
      });
    },
  );
});

async function setupConfigPage(page: Page, testInfo: any, eyes: any) {
  const configPage = new ServiceSpecConfigPage(
    page,
    testInfo,
    eyes,
    PRODUCT_SEARCH_BFF_SPEC_BACKWARD_COMPATIBILITY,
  );
  await test.step(`Go to Spec page for Service Spec: '${PRODUCT_SEARCH_BFF_SPEC_BACKWARD_COMPATIBILITY}'`, async () => {
    await configPage.gotoHomeAndOpenSidebar();
    await configPage.sideBar.selectSpec(
      PRODUCT_SEARCH_BFF_SPEC_BACKWARD_COMPATIBILITY,
    );
    await configPage.openSpecTab();
  });
  return configPage;
}
