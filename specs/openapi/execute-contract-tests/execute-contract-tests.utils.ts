import { expect } from "../../../utils/eyesFixture";
import { ApiContractPage } from "../../../page-objects/api-contract-page";

export async function validateSummaryAndTableCounts(
  contractPage: ApiContractPage,
  expected: {
    success: number;
    failed: number;
    total: number;
    error: number;
    notcovered: number;
    excluded: number;
  },
) {
  const tableTotals = await contractPage.getAggregateTableResults();
  const headerTotals = await contractPage.getSummaryHeaderTotals();

  expect(
    tableTotals,
    "Internal Check: Table sum must match Header counts",
  ).toStrictEqual(headerTotals);

  expect(
    headerTotals,
    "Business Check: Header counts must match expected values",
  ).toStrictEqual(expected);
}

export async function toggleFailedTestViewForTableandRaw(
  contractPage: ApiContractPage,
) {
  const failedCount = await contractPage.getFailedResultsCount(0);

  await expect(contractPage.failedResultCountSpans.nth(0)).toBeVisible();

  await contractPage.clickFailedResults(0);

  await contractPage.verifyFailedScenariosCount(failedCount);

  await expect(contractPage.drillDownScenarios).toHaveCount(failedCount, {
    timeout: 10000,
  });

  await contractPage.toggleScenarioViews(0);

  await contractPage.toggleScenarioViews(failedCount - 1);
}

export async function verifyAllContractRemarks(contractPage: ApiContractPage) {
  // TODO: Add verification for the new /inventory endpoint once the spec is updated

  /* await contractPage.verifyRowRemark(
    "/products",
    "POST",
    "201",
    "covered"
  ); 
  */

  await contractPage.verifyRowRemark(
    "/findAvailableProducts",
    "GET",
    "200",
    /covered/i,
  );

  await contractPage.verifyRowRemark(
    "/ordres",
    "POST",
    "201",
    "not implemented",
  );

  await contractPage.verifyRowRemark("/health", "GET", "0", "Missing In Spec");
}
