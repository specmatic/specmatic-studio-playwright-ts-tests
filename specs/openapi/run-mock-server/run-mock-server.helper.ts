import { expect } from "playwright/test";
import { MockServerPage } from "../../../page-objects/mock-server-page";

export async function validateMockSummaryAndTableCounts(
  mockPage: MockServerPage,
  expected: {
    success: number;
    failed: number;
    total: number;
    error?: number;
    notcovered?: number;
    excluded?: number;
  },
) {
  const headerTotals = await mockPage.getMockSummaryHeaderTotals();

  expect(
    headerTotals,
    "Business Check: Mock header counts must match expected values",
  ).toStrictEqual({
    success: expected.success,
    failed: expected.failed,
    total: expected.total,
    error: expected.error || 0,
    notcovered: expected.notcovered || 0,
    excluded: expected.excluded || 0,
  });
}
