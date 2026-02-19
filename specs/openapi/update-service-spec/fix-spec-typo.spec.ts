import { test, expect } from "../../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC } from "../../specNames";
import { ServiceSpecConfigPage } from "../../../page-objects/service-spec-config-page";

test.describe("Fix Spec Typo - Conditional Update", () => {
  let specCopy: string;

  test.beforeEach(async () => {
    const fs = require("fs");
    const nodePath = require("path");

    const specsDir = nodePath.join(
      process.cwd(),
      "specmatic-studio-demo",
      "specs",
    );
    const originalPath = nodePath.join(specsDir, PRODUCT_SEARCH_BFF_SPEC);

    // Create an isolated copy to work on
    specCopy = `${PRODUCT_SEARCH_BFF_SPEC.replace(".yaml", "")}-test-copy.yaml`;
    const copyPath = nodePath.join(specsDir, specCopy);

    fs.copyFileSync(originalPath, copyPath);
    console.log(`[beforeEach] Created isolated copy: ${specCopy}`);
  });

  test.afterEach(async () => {
    const fs = require("fs");
    const nodePath = require("path");
    const copyPath = nodePath.join(
      process.cwd(),
      "specmatic-studio-demo",
      "specs",
      specCopy,
    );

    if (fs.existsSync(copyPath)) {
      fs.unlinkSync(copyPath);
      console.log(`[afterEach] Cleaned up temporary spec: ${specCopy}`);
    }
  });

  test(
    "Fix /ordres typo to /orders ONLY if it exists",
    { tag: ["@spec", "@fixSpecTypo"] },
    async ({ page, eyes }, testInfo) => {
      const configPage = new ServiceSpecConfigPage(
        page,
        testInfo,
        eyes,
        specCopy,
      );

      await configPage.navigateToSpec(specCopy);

      const hasTypo = configPage.specFileContains("  /ordres:");

      if (hasTypo) {
        await test.step("Typo detected: Fixing /ordres to /orders", async () => {
          await configPage.editSpecFile("  /ordres:", "  /orders:");

          await page.reload();
          await configPage.gotoHomeAndOpenSidebar();
          await configPage.sideBar.selectSpec(specCopy);

          await configPage.verifyEndpointInContractTable("/orders", "/ordres");
        });
      } else {
        await test.step("No typo detected: Verifying current endpoint state", async () => {
          console.log(
            "\t✓ No typo found. Ensuring '/orders' is already present.",
          );
          await configPage.verifyEndpointInContractTable("/orders");
        });
      }
    },
  );
});
