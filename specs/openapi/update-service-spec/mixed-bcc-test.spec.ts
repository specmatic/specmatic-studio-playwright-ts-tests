import { test, expect } from "../../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC_BACKWARD_INCOMPATIBLE } from "../../specNames";
import { ServiceSpecConfigPage } from "../../../page-objects/service-spec-config-page";

interface MixedScenario {
  name: string;
  originalText: string;
  newText: string;
  removeXLinesFromSpec: number;
  isCompatible: boolean;
  expectedErrorCount: number;
  expectedErrorDetail: string;
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
        expectedErrorCount: 0,
        expectedErrorDetail: "",
      },
      {
        name: "Change response code (Incompatible)",
        originalText: "'201':",
        newText: "'299':",
        removeXLinesFromSpec: 0,
        isCompatible: false,
        expectedErrorCount: 1,
        expectedErrorDetail: "This API exists in the old contract",
      },
      {
        name: "Remove requestBody content (Incompatible)",
        originalText: "        content:",
        newText: "",
        removeXLinesFromSpec: 4,
        isCompatible: false,
        expectedErrorCount: 3,
        expectedErrorDetail:
          "This is no body in the new specification, but json object in the old specification",
      },
    ],
  },
  {
    groupName: "Making optional Parameter Required",
    scenarios: [
      {
        name: "Change optional parameter to required",
        originalText: "        required: false",
        newText: "        required: true",
        removeXLinesFromSpec: 0,
        isCompatible: false,
        expectedErrorCount: 3,
        expectedErrorDetail:
          'New specification expects query param "type" in the request',
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

    const toastText = await configPage.getAlertMessageText();

    if (scenario.isCompatible) {
      expect(toastText.toLowerCase()).toContain("backward compatible");
      await configPage.dismissAlert();
    } else {
      expect(toastText.toLowerCase()).toContain("failed");
      await configPage.dismissAlert();

      await configPage.toggleBccErrorSection(true);
      const { summary, details } = await configPage.getBccErrorDetails();

      const errorSuffix =
        scenario.expectedErrorCount === 1 ? "error" : "errors";
      expect
        .soft(summary)
        .toContain(
          `Backward Compatibility found ${scenario.expectedErrorCount} ${errorSuffix}`,
        );

      const hasMatch = details.some((d: string) =>
        d.includes(scenario.expectedErrorDetail),
      );
      expect
        .soft(
          hasMatch,
          `Expected detail not found: ${scenario.expectedErrorDetail}`,
        )
        .toBe(true);
    }
  });
}
