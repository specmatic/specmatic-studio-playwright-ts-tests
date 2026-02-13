#!/usr/bin/env node
// generate-failed-test-screenshots-summary.js
// This script parses Playwright's junit-report.xml and generates a Markdown summary with links to the last screenshot for each failed test.

const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");

const testResultsPath = path.join(
  __dirname,
  "../playwright-report/test-results.json",
);
const outputSummaryPath = path.join(
  __dirname,
  "../playwright-report/failed-tests-summary.md",
);

function getFailedTestsWithScreenshots() {
  if (!fs.existsSync(testResultsPath)) {
    console.error("Playwright JSON report not found:", testResultsPath);
    process.exit(1);
  }
  const report = JSON.parse(fs.readFileSync(testResultsPath, "utf-8"));
  const failed = [];
  function walkSuites(suites, parentTitles = []) {
    for (const suite of suites) {
      const titles = [...parentTitles, suite.title];
      if (suite.specs) {
        for (const spec of suite.specs) {
          for (const test of spec.tests || []) {
            for (const result of test.results || []) {
              if (result.status === "failed") {
                // Find the last screenshot attachment, if any
                let screenshot = null;
                if (result.attachments) {
                  // Prefer the last PNG attachment with a path
                  const pngs = result.attachments.filter(
                    (a) => a.contentType === "image/png" && a.path,
                  );
                  if (pngs.length > 0) {
                    screenshot = path.relative(
                      path.join(__dirname, ".."),
                      pngs[pngs.length - 1].path,
                    );
                  }
                }
                failed.push({
                  name: [...titles, spec.title].join(" › "),
                  screenshot,
                });
              }
            }
          }
        }
      }
      if (suite.suites) walkSuites(suite.suites, titles);
    }
  }
  walkSuites(report.suites || []);
  return failed;
}

async function main() {
  const failed = getFailedTestsWithScreenshots();
  let summary = "# Failed Playwright Tests with Screenshots\n\n";
  if (failed.length === 0) {
    summary += "No failed tests!\n";
  } else {
    // Group by spec file (first part of the name, before the first ' › ')
    const grouped = {};
    for (const test of failed) {
      const [specFile, ...rest] = test.name.split(" › ");
      if (!grouped[specFile]) grouped[specFile] = [];
      grouped[specFile].push({
        name: rest.join(" › "),
        screenshot: test.screenshot,
      });
    }
    for (const specFile of Object.keys(grouped)) {
      summary += `## ${specFile}\n\n`;
      for (const test of grouped[specFile]) {
        summary += `- **${test.name}**\n`;
        if (test.screenshot) {
          summary += `  ![Screenshot](${test.screenshot})\n`;
        } else {
          summary += "  _No screenshot found_\n";
        }
      }
      summary += "\n";
    }
  }
  fs.writeFileSync(outputSummaryPath, summary);
  console.log("Summary written to", outputSummaryPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
