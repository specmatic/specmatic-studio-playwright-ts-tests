import { test, expect } from "../../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC_BACKWARD_INCOMPATIBLE } from "../../specNames";
import { ServiceSpecConfigPage } from "../../../page-objects/service-spec-config-page";
import { Page } from "@playwright/test";

const INCOMPATIBLE_SCENARIOS = [
  {
    name: "Add path parameter to existing endpoint",
    oldText: "  /products:",
    newText: "  /products/{id}:",
    lineCount: 0,
    expectedLineText: "/products/{id}:",
  },
  {
    name: "Remove a response status code",
    oldText: "        '201':",
    newText: "        '299':",
    lineCount: 0,
    expectedDialogCounts: {
      failed: 1,
      passed: 48,
      total: 49,
    },
    expectedRowText: "This API exists in the old contract but not in the new contract",
    expectedLineText: "'299':",
  },
  {
    name: "Change optional parameter to required",
    oldText: "        required: false",
    newText: "        required: true",
    lineCount: 0,
    expectedLineText: "required: true",
  },
  {
    name: "Remove all content from requestBody",
    oldText: "        content:",
    newText: "",
    lineCount: 4,
    expectedLineText: "requestBody:",
  },
];

test.describe("API Specification — Backward Incompatibility", () => {
  let configPage: ServiceSpecConfigPage;

  test.beforeEach(async ({ page, eyes }, testInfo) => {
    configPage = await setupConfigPage(page, testInfo, eyes);
  });

  test(
    "Show an all-pass backward compatibility summary for the untouched spec",
    { tag: ["@spec", "@bccAllPass", "@eyes"] },
    async () => {
      await test.step("Run backward compatibility without editing the spec", async () => {
        await configPage.gotoHomeAndOpenSidebar();
        await configPage.sideBar.selectSpec(
          PRODUCT_SEARCH_BFF_SPEC_BACKWARD_INCOMPATIBLE,
        );
        await configPage.openSpecTab();

        await configPage.runBackwardCompatibilityTest();
        const result = await configPage.getBackwardCompatibilityResult();

        expect(result.title).toBe("Backward Compatibility Check Complete");
        expect(result.failed).toBe(0);
        expect(result.passed).toBeGreaterThan(0);
        expect(result.total).toBe(result.passed);

        await configPage.dismissAlert();
      });
    },
  );

  test(
    "Show a failure summary and allow jumping to the failing line",
    { tag: ["@spec", "@bccIncompatibleTest", "@eyes"] },
    async () => {
      const scenario = INCOMPATIBLE_SCENARIOS[1];

      await test.step("Open the spec editor", async () => {
        await configPage.gotoHomeAndOpenSidebar();
        await configPage.sideBar.selectSpec(
          PRODUCT_SEARCH_BFF_SPEC_BACKWARD_INCOMPATIBLE,
        );
        await configPage.openSpecTab();
      });

      await test.step("Make a backward incompatible response-code change", async () => {
        await configPage.editSpecInEditor(scenario.oldText, scenario.newText);
      });

      await test.step("Run backward compatibility once and assert the dialog counts", async () => {
        await configPage.runBackwardCompatibilityTest();
        const result = await configPage.getBackwardCompatibilityResult();

        expect(result.title).toBe("Backward Compatibility Check Complete");
        expect(result.failed).toBe(scenario.expectedDialogCounts.failed);
        expect(result.passed).toBe(scenario.expectedDialogCounts.passed);
        expect(result.total).toBe(scenario.expectedDialogCounts.total);

        await configPage.dismissAlert();
      });

      await test.step("Expand the summary and verify navigation to the failing line", async () => {
        await configPage.assertBccErrorRowNavigation(
          scenario.expectedRowText,
          scenario.expectedLineText,
        );
      });
    },
  );
});

async function setupConfigPage(page: Page, testInfo: any, eyes: any) {
  const configPage = new ServiceSpecConfigPage(
    page,
    testInfo,
    eyes,
    PRODUCT_SEARCH_BFF_SPEC_BACKWARD_INCOMPATIBLE,
  );

  return configPage;
}
