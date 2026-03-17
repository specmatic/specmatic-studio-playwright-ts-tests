import { test } from "../../../utils/eyesFixture";
import { ServiceSpecConfigPage } from "../../../page-objects/service-spec-config-page";
import { INVENTORY_WSDL_CONTRACT_TESTS } from "../../specNames";

test.describe("Saving SOAP Spec", () => {
  test(
    "Save SOAP Spec",
    { tag: ["@soap", "@spec", "@saveSpec", "@eyes"] },
    async ({ page, eyes }, testInfo) => {
      const configPage = new ServiceSpecConfigPage(
        page,
        testInfo,
        eyes,
        INVENTORY_WSDL_CONTRACT_TESTS,
      );

      await test.step(
        `Go to Spec page for Service Spec: '${INVENTORY_WSDL_CONTRACT_TESTS}'`,
        async () => {
          await configPage.gotoHomeAndOpenSidebar();
          await configPage.sideBar.selectSpec(INVENTORY_WSDL_CONTRACT_TESTS);
          await configPage.openSpecTab();
        },
      );

      await configPage.saveSpecAndAssertSuccessDialog();
    },
  );
});
