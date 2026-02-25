// Reads failed-tests-summary.md and appends it to the GitHub Actions job summary.
import fs from "fs";

const summaryPath = "playwright-report/failed-tests-summary.md";
const jobSummaryPath = process.env.GITHUB_STEP_SUMMARY;

if (!jobSummaryPath) {
  console.error("GITHUB_STEP_SUMMARY is not set.");
  process.exit(1);
}

if (!fs.existsSync(summaryPath)) {
  console.error("Summary file not found:", summaryPath);
  process.exit(1);
}

const summary = fs.readFileSync(summaryPath, "utf-8");
fs.appendFileSync(jobSummaryPath, summary + "\n");
console.log("Summary appended to GitHub Actions job summary.");
