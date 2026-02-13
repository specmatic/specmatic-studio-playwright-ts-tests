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
  // Read Playwright JSON report for summary stats
  if (!fs.existsSync(testResultsPath)) {
    console.error("Playwright JSON report not found:", testResultsPath);
    process.exit(1);
  }
  const report = JSON.parse(fs.readFileSync(testResultsPath, "utf-8"));
  // Collect stats
  let total = 0,
    passed = 0,
    failed = 0,
    skipped = 0;
  function collectStats(suites) {
    for (const suite of suites) {
      if (suite.specs) {
        for (const spec of suite.specs) {
          for (const test of spec.tests || []) {
            total++;
            let foundFailed = false,
              foundPassed = false,
              foundSkipped = false;
            for (const result of test.results || []) {
              if (result.status === "failed") foundFailed = true;
              else if (result.status === "passed") foundPassed = true;
              else if (result.status === "skipped") foundSkipped = true;
            }
            if (foundFailed) failed++;
            else if (foundPassed) passed++;
            else if (foundSkipped) skipped++;
          }
        }
      }
      if (suite.suites) collectStats(suite.suites);
    }
  }
  collectStats(report.suites || []);

  // Get failed tests with screenshots and errors
  function getFailedTestsWithScreenshotsAndErrors() {
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
                  // Get error message
                  let error =
                    result.error && result.error.message
                      ? result.error.message
                      : "";
                  failed.push({
                    name: [...titles, spec.title].join(" › "),
                    screenshot,
                    error,
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

  const failedTests = getFailedTestsWithScreenshotsAndErrors();

  // Group by spec file (first part of the name, before the first ' › ')
  const grouped = {};
  for (const test of failedTests) {
    const [specFile, ...rest] = test.name.split(" › ");
    if (!grouped[specFile]) grouped[specFile] = [];
    grouped[specFile].push({
      name: rest.join(" › "),
      screenshot: test.screenshot,
      error: test.error,
    });
  }

  // HTML output for better formatting and expand/collapse
  // Markdown output with collapsible sections and embedded screenshots
  let summary = `# Playwright Test Results Summary\n\n`;
  summary += `| Total | Passed | Failed | Skipped |\n|-------|--------|--------|---------|\n| ${total} | ${passed} | ${failed} | ${skipped} |\n\n`;

  if (failedTests.length === 0) {
    summary += `## No failed tests!\n`;
  } else {
    for (const specFile of Object.keys(grouped)) {
      summary += `\n<details>\n<summary><strong>${specFile}</strong></summary>\n\n`;
      for (const test of grouped[specFile]) {
        summary += `### ${test.name}\n`;
        if (test.screenshot) {
          summary += `![Screenshot](${test.screenshot})\n\n`;
        } else {
          summary += `_No screenshot found_\n\n`;
        }
        if (test.error) {
          const errorLines = test.error.split("\n");
          const previewLines = errorLines.slice(0, 8).join("\n");
          summary += `**Error (preview):**\n\n`;
          summary += "``\n" + previewLines + "\n";
          if (errorLines.length > 8) {
            summary += "...\n";
          }
          summary += "``\n";
          if (errorLines.length > 8) {
            summary += `<details>\n<summary>Full Error</summary>\n\n`;
            summary += "``\n" + test.error + "\n``\n";
            summary += `</details>\n`;
          }
        } else {
          summary += `_No error message_\n`;
        }
        summary += `---\n`;
      }
      summary += `</details>\n`;
    }
  }
  fs.writeFileSync(outputSummaryPath, summary);
  console.log("Summary written to", outputSummaryPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
