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
    expectedErrorCount: 1,
    expectedDetail:
      "This API exists in the old contract but not in the new contract",
    isExpectedFailure: false,
  },
  {
    name: "Remove a response status code",
    oldText: "        '201':",
    newText: "        '299':",
    lineCount: 0,
    expectedErrorCount: 1,
    expectedDetail:
      "This API exists in the old contract but not in the new contract",
    isExpectedFailure: false,
  },
  {
    name: "Change optional parameter to required",
    oldText: "        required: false",
    newText: "        required: true",
    lineCount: 0,
    expectedErrorCount: 1,
    expectedDetail:
      'New specification expects query param "type" in the request',
    isExpectedFailure: false,
  },
  {
    name: "Remove all content from requestBody",
    oldText: "        content:",
    newText: "",
    lineCount: 4,
    expectedErrorCount: 1,
    expectedDetail:
      "This is no body in the new specification, but json object in the old specification",
    isExpectedFailure: false,
  },
];

test.describe("API Specification — Backward Incompatibility", () => {
  let configPage: ServiceSpecConfigPage;

  test.beforeEach(async ({ page, eyes }, testInfo) => {
    configPage = await setupConfigPage(page, testInfo, eyes);
  });

  test(
    "Run all incompatibility scenarios in one session",
    { tag: ["@spec", "@bccIncompatibleTest", "@eyes"] },
    async () => {
      for (const scenario of INCOMPATIBLE_SCENARIOS) {
        await test.step(`Testing scenario: ${scenario.name}`, async () => {
          await configPage.verifyIncompatibilityScenario(scenario);
        });
      }
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
