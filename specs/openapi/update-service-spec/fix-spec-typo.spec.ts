import { test, expect } from "../../../utils/eyesFixture";
import { PRODUCT_SEARCH_BFF_SPEC } from "../../specNames";
import {
  ServiceSpecConfigPage,
} from "../../../page-objects/service-spec-config-page";

test.describe("Fix Spec Typo - Update endpoint path in service spec", () => {
  test.beforeEach(async () => {
    const fs = require("fs") as typeof import("fs");
    const nodePath = require("path") as typeof import("path");
    const specFilePath = nodePath.join(
      process.cwd(),
      "specmatic-studio-demo",
      "specs",
      PRODUCT_SEARCH_BFF_SPEC,
    );
    const content = fs.readFileSync(specFilePath, "utf-8");
    if (content.includes("  /orders:") && !content.includes("  /ordres:")) {
      fs.writeFileSync(specFilePath, content.replace("  /orders:", "  /ordres:"), "utf-8");
      console.log("[beforeEach] Restored /ordres: typo in spec file for test repeatability");
    }
  });

  test(
    "Fix /ordres typo to /orders and verify endpoint is updated in examples table",
    {
      tag: [
        "@spec",
        "@fixSpecTypo",
        "@updateEndpointPath",
      ],
    },
    async ({ page, eyes }, testInfo) => {
      test.setTimeout(120000);
      try {
        console.log(`Starting test: ${testInfo.title}`);

        const configPage = new ServiceSpecConfigPage(
          page,
          testInfo,
          eyes,
          PRODUCT_SEARCH_BFF_SPEC,
        );

        await test.step(
          `Navigate to spec '${PRODUCT_SEARCH_BFF_SPEC}' and open Spec tab`,
          async () => {
            await configPage.gotoHomeAndOpenSidebar();
            await configPage.sideBar.selectSpec(PRODUCT_SEARCH_BFF_SPEC);
            await configPage.openSpecTab();
          },
        );

        await test.step("Fix the /ordres typo to /orders in the spec file", async () => {
          await configPage.editSpecFile("  /ordres:", "  /orders:");

          console.log("\tReloading page to sync UI with disk changes...");
          await page.reload();

          await configPage.gotoHomeAndOpenSidebar();
          await configPage.sideBar.selectSpec(PRODUCT_SEARCH_BFF_SPEC);
        });

        await test.step(
          "Verify /orders appears and /ordres is gone in the contract test table",
          async () => {
            await configPage.verifyEndpointInContractTable(
              "/orders",
              "/ordres",
            );
          },
        );
      } catch (err) {
        expect
          .soft(err, `Unexpected error in test: ${testInfo.title}`)
          .toBeUndefined();
      }
    },
  );
});
