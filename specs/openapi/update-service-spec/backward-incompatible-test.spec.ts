import { test, expect } from "../../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC_BACKWARD_INCOMPATIBLE } from "../../specNames";
import { ServiceSpecConfigPage } from "../../../page-objects/service-spec-config-page";

test.describe("API Specification — Backward Incompatibility", () => {
  test(
    "Adding path parameter to existing endpoint to check backward compatibility",
    { tag: ["@spec", "@bccIncompatibleTest", "@eyes"] },
    async ({ page, eyes }, testInfo) => {
      const configPage = new ServiceSpecConfigPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC_BACKWARD_INCOMPATIBLE,
      );

      await test.step(`Go to Spec page for Service Spec: '${PRODUCT_SEARCH_BFF_SPEC_BACKWARD_INCOMPATIBLE}'`, async () => {
        await configPage.gotoHomeAndOpenSidebar();
        await configPage.sideBar.selectSpec(
          PRODUCT_SEARCH_BFF_SPEC_BACKWARD_INCOMPATIBLE,
        );
        await configPage.openSpecTab();
      });

      await test.step("Change /products to /products/{id} in the editor", async () => {
        await configPage.editSpecInEditor("  /products:", "  /products/{id}:");
      });

      await test.step("Run Backward Compatibility test and assert failure toast", async () => {
        await configPage.runBackwardCompatibilityTest();
        const toastText = await configPage.getAlertMessageText();
        expect(toastText).toContain("Backward compatibility test failed");
        await configPage.dismissAlert();
      });

      await test.step("Assert error dropdown heading shows 1 error", async () => {
        await configPage.toggleBccErrorSection(true);
        const { summary } = await configPage.getBccErrorDetails();
        expect(summary).toContain("Backward Compatibility found 1 error");
      });

      await test.step("Assert error detail describes the missing API", async () => {
        const { details } = await configPage.getBccErrorDetails();
        expect(details.length).toBeGreaterThan(0);
        expect(details[0]).toContain(
          "This API exists in the old contract but not in the new contract",
        );
      });
    },
  );

  test(
    "Removing a response status code is a backward incompatible change",
    { tag: ["@spec", "@bccIncompatibleTest", "@eyes"] },
    async ({ page, eyes }, testInfo) => {
      const configPage = new ServiceSpecConfigPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC_BACKWARD_INCOMPATIBLE,
      );

      await test.step(`Go to Spec page for Service Spec: '${PRODUCT_SEARCH_BFF_SPEC_BACKWARD_INCOMPATIBLE}'`, async () => {
        await configPage.gotoHomeAndOpenSidebar();
        await configPage.sideBar.selectSpec(
          PRODUCT_SEARCH_BFF_SPEC_BACKWARD_INCOMPATIBLE,
        );
        await configPage.openSpecTab();
      });

      await test.step("Change response status code '201' to '299' under /products in the editor", async () => {
        await configPage.editSpecInEditor("        '201':", "        '299':");
      });

      await test.step("Run Backward Compatibility test and assert failure toast", async () => {
        await configPage.runBackwardCompatibilityTest();
        const toastText = await configPage.getAlertMessageText();
        expect(toastText).toContain("Backward compatibility test failed");
        await configPage.dismissAlert();
      });

      await test.step("Assert error dropdown heading shows 1 error", async () => {
        await configPage.toggleBccErrorSection(true);
        const { summary } = await configPage.getBccErrorDetails();
        expect(summary).toContain("Backward Compatibility found 1 error");
      });

      await test.step("Assert error detail describes the missing API", async () => {
        const { details } = await configPage.getBccErrorDetails();
        expect(details.length).toBeGreaterThan(0);
        expect(details[0]).toContain(
          "This API exists in the old contract but not in the new contract",
        );
      });
    },
  );

  test(
    "Making a required parameter optional is a backward incompatible change",
    { tag: ["@spec", "@bccIncompatibleTest", "@eyes"] },
    async ({ page, eyes }, testInfo) => {
      const configPage = new ServiceSpecConfigPage(
        page,
        testInfo,
        eyes,
        PRODUCT_SEARCH_BFF_SPEC_BACKWARD_INCOMPATIBLE,
      );

      await test.step(`Go to Spec page for Service Spec: '${PRODUCT_SEARCH_BFF_SPEC_BACKWARD_INCOMPATIBLE}'`, async () => {
        await configPage.gotoHomeAndOpenSidebar();
        await configPage.sideBar.selectSpec(
          PRODUCT_SEARCH_BFF_SPEC_BACKWARD_INCOMPATIBLE,
        );
        await configPage.openSpecTab();
      });

      await test.step("Making optional Parameter required", async () => {
        await configPage.editSpecInEditor(
          "        required: false",
          "        required: true",
        );
      });

      await test.step("Run Backward Compatibility test and assert failure toast", async () => {
        await configPage.runBackwardCompatibilityTest();
        const toastText = await configPage.getAlertMessageText();
        expect(toastText).toContain("Backward compatibility test failed");
        await configPage.dismissAlert();
      });

      await test.step("Assert error dropdown heading shows 1 error", async () => {
        await configPage.toggleBccErrorSection(true);
        const { summary } = await configPage.getBccErrorDetails();
        expect(summary).toContain("Backward Compatibility found 1 error");
      });

      await test.step("Assert error detail describes the missing API", async () => {
        const { details } = await configPage.getBccErrorDetails();
        expect(details.length).toBeGreaterThan(0);
        expect(details[0]).toContain(
          'New specification expects query param "type" in the request but it is missing from the old specification',
        );
      });
    },
  );
});
