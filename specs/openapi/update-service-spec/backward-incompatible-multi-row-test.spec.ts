import { test, expect } from "../../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC_BACKWARD_INCOMPATIBLE } from "../../specNames";
import { ServiceSpecConfigPage } from "../../../page-objects/service-spec-config-page";
import { Page } from "@playwright/test";

test.describe("API Specification — Backward Incompatibility Multi Row", () => {
  test(
    "Show multiple backward incompatible rows and navigate from each row to the right line",
    {
      tag: ["@spec", "@bccIncompatibleMultiRow", "@eyes", "@expected-failure"],
    },
    async ({ page, eyes }, testInfo) => {
      test.fail(
        true,
        "Bug in BCC when a optional parameter is marked as required in the query param",
      );
      const configPage = await setupConfigPage(page, testInfo, eyes);

      await test.step("Open the spec editor", async () => {
        await configPage.gotoHomeAndOpenSidebar();
        await configPage.sideBar.selectSpec(
          PRODUCT_SEARCH_BFF_SPEC_BACKWARD_INCOMPATIBLE,
        );
        await configPage.openSpecTab();
      });

      await test.step("Make more than one backward incompatible change", async () => {
        await configPage.editSpecInEditor("        '201':", "        '299':");
        await configPage.editSpecInEditor(
          "        required: false",
          "        required: true",
        );
      });

      await test.step("Run backward compatibility and assert there are multiple failures", async () => {
        await configPage.runBackwardCompatibilityTest();
        const result = await configPage.getBackwardCompatibilityResult();

        expect(result.title).toBe("Backward Compatibility Check Complete");
        expect(result.failed).toBeGreaterThan(1);
        expect(result.total).toBe(result.failed + result.passed);

        await configPage.dismissAlert();
      });

      await test.step("Expand the issues table and assert its rows", async () => {
        await configPage.assertBccIssuesTableVisible(2);
        const rows = await configPage.getBccIssueRows();

        expect(rows[0].rule).toBe("General Error");
        expect(rows[0].fieldPath).toBe("paths./products.post.responses.201");
        expect(rows[0].reason).toContain(
          "This API exists in the old contract but not in the new contract",
        );

        expect(rows[1].rule).toBe("R2001: Missing required property");
        expect(rows[1].fieldPath).toBe("REQUEST.PARAMETERS.QUERY.type");
        expect(rows[1].reason).toContain(
          'New specification expects query param "type" in the request',
        );
      });

      await test.step("Click each issue row and verify it navigates to the right line", async () => {
        await configPage.assertBccIssueRowsNavigate([
          {
            fieldPath: "paths./products.post.responses.201",
            reason:
              "This API exists in the old contract but not in the new contract",
            expectedLineText: "'299':",
          },
          {
            fieldPath: "REQUEST.PARAMETERS.QUERY.type",
            reason:
              'New specification expects query param "type" in the request',
            expectedLineText: "required: true",
          },
        ]);
      });
    },
  );
});

async function setupConfigPage(page: Page, testInfo: any, eyes: any) {
  return new ServiceSpecConfigPage(
    page,
    testInfo,
    eyes,
    PRODUCT_SEARCH_BFF_SPEC_BACKWARD_INCOMPATIBLE,
  );
}
