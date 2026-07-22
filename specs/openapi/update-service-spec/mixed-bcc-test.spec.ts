import { test, expect } from "../../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC_BACKWARD_INCOMPATIBLE } from "../../specNames";
import { ServiceSpecConfigPage } from "../../../page-objects/service-spec-config-page";

interface MixedScenario {
  name: string;
  originalText: string;
  newText: string;
  removeXLinesFromSpec: number;
  isCompatible: boolean;
  expectedLineText?: string;
}

interface ScenarioGroup {
  groupName: string;
  scenarios: MixedScenario[];
}

const MIXED_SCENARIO_GROUPS: ScenarioGroup[] = [
  {
    groupName: "Compatible then Incompatible — Edit-based changes",
    scenarios: [
      {
        name: "Rename summary (Compatible)",
        originalText: "summary: Create a new product",
        newText: "summary: Create Product",
        removeXLinesFromSpec: 0,
        isCompatible: true,
      },
      {
        name: "Change response code (Incompatible)",
        originalText: "'201':",
        newText: "'299':",
        removeXLinesFromSpec: 0,
        isCompatible: false,
        expectedLineText: "'299':",
      },
      {
        name: "Remove requestBody content (Incompatible)",
        originalText: "        content:",
        newText: "",
        removeXLinesFromSpec: 4,
        isCompatible: false,
        expectedLineText: "requestBody:",
      },
      {
        name: "Change optional parameter to required",
        originalText: "        required: false",
        newText: "        required: true",
        removeXLinesFromSpec: 0,
        isCompatible: false,
        expectedLineText: "required: true",
      },
    ],
  },
];

test.describe("API Specification — Mixed Backward Compatibility Analysis", () => {
  for (const group of MIXED_SCENARIO_GROUPS) {
    test(
      `Group: ${group.groupName}`,
      { tag: ["@bcc", "@mixed"] },
      async ({ page, eyes }, testInfo) => {
        const configPage = new ServiceSpecConfigPage(
          page,
          testInfo,
          eyes,
          PRODUCT_SEARCH_BFF_SPEC_BACKWARD_INCOMPATIBLE,
        );

        await test.step("Navigate to Spec Editor", async () => {
          await configPage.gotoHomeAndOpenSidebar();
          await configPage.sideBar.selectSpec(
            PRODUCT_SEARCH_BFF_SPEC_BACKWARD_INCOMPATIBLE,
          );
          await configPage.openSpecTab();
        });

        for (const scenario of group.scenarios) {
          await applyScenarioChange(configPage, scenario);
          await assertScenarioResult(configPage, scenario);
        }
      },
    );
  }
});

async function applyScenarioChange(
  configPage: ServiceSpecConfigPage,
  scenario: MixedScenario,
) {
  await test.step(`Apply Change: ${scenario.name}`, async () => {
    if (scenario.removeXLinesFromSpec > 0) {
      await configPage.deleteSpecLinesInEditor(
        scenario.originalText,
        scenario.removeXLinesFromSpec,
      );
    } else if (scenario.newText !== "") {
      await configPage.editSpecInEditor(
        scenario.originalText,
        scenario.newText,
      );
    }
  });
}

async function assertScenarioResult(
  configPage: ServiceSpecConfigPage,
  scenario: MixedScenario,
) {
  await test.step(`Assert Result: ${scenario.name}`, async () => {
    await configPage.runBackwardCompatibilityTest();

    const result = await configPage.getBackwardCompatibilityResult();
    expect(result.title).toBe("Backward Compatibility Check Complete");
    expect(result.total).toBe(result.failed + result.passed);

    if (scenario.isCompatible) {
      expect(result.failed).toBe(0);
      expect(result.passed).toBeGreaterThan(0);
      await configPage.dismissAlert();
    } else {
      expect(result.failed).toBeGreaterThan(0);
      expect(result.passed).toBeGreaterThanOrEqual(0);
      await configPage.dismissAlert();

      await configPage.toggleBccErrorSection(true);
      expect(await configPage.getBccErrorItemCount()).toBeGreaterThan(0);

      if (scenario.expectedLineText) {
        await configPage.assertBccErrorNavigation(scenario.expectedLineText);
      }
    }
  });
}
