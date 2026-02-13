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
  let summary = `<!DOCTYPE html>\n<html>\n<head>\n<meta charset='utf-8'>\n<title>Failed Playwright Tests with Screenshots</title>\n<style>\nbody { font-family: Arial, sans-serif; margin: 2em; }\ntable { border-collapse: collapse; width: 100%; word-break: break-word; }\nth, td { border: 1px solid #ddd; padding: 8px; }\nth { background: #f2f2f2; }\n.screenshot-img { max-width: 400px; max-height: 200px; display: block; margin-top: 4px; }\n.error-block { white-space: pre-wrap; word-break: break-word; background: #f9f9f9; border: 1px solid #ccc; padding: 8px; margin: 4px 0; }\n.expand-btn { color: #007bff; cursor: pointer; text-decoration: underline; background: none; border: none; font-size: 1em; padding: 0; }\n@media (max-width: 600px) { .screenshot-img { max-width: 100%; } }\n</style>\n</head>\n<body>\n`;
  summary += `<h1>Playwright Test Results Summary</h1>\n`;
  summary += `<table><tr><th>Total</th><th>Passed</th><th>Failed</th><th>Skipped</th></tr>`;
  summary += `<tr><td>${total}</td><td>${passed}</td><td>${failed}</td><td>${skipped}</td></tr></table>\n`;

  if (failedTests.length === 0) {
    summary += `<h2>No failed tests!</h2>`;
  } else {
    for (const specFile of Object.keys(grouped)) {
      summary += `<h2>${specFile}</h2>\n`;
      summary += `<table>\n<tr><th>Test Name</th><th>Screenshot</th><th>Error</th></tr>\n`;
      for (const test of grouped[specFile]) {
        summary += `<tr>`;
        summary += `<td><b>${test.name}</b></td>`;
        // Screenshot
        if (test.screenshot) {
          summary += `<td><img src="${test.screenshot}" class="screenshot-img" alt="Screenshot"></td>`;
        } else {
          summary += `<td><i>No screenshot found</i></td>`;
        }
        // Error block with expand/collapse
        if (test.error) {
          const errorLines = test.error.split("\n");
          const previewLines = errorLines.slice(0, 8).join("\n");
          const fullError = test.error
            .replace(/\n/g, "\\n")
            .replace(/'/g, "&#39;");
          const previewError = previewLines
            .replace(/\n/g, "\\n")
            .replace(/'/g, "&#39;");
          const errorId = `error-${specFile.replace(/[^a-zA-Z0-9]/g, "")}-${test.name.replace(/[^a-zA-Z0-9]/g, "")}`;
          summary += `<td><div class="error-block" id="${errorId}-preview">${previewError}</div>`;
          if (errorLines.length > 8) {
            summary += `<button class="expand-btn" onclick="document.getElementById('${errorId}-preview').style.display='none';document.getElementById('${errorId}-full').style.display='block';">See more</button>`;
            summary += `<div class="error-block" id="${errorId}-full" style="display:none;">${fullError}<br><button class="expand-btn" onclick="document.getElementById('${errorId}-full').style.display='none';document.getElementById('${errorId}-preview').style.display='block';">Collapse</button></div>`;
          }
          summary += `</td>`;
        } else {
          summary += `<td><i>No error message</i></td>`;
        }
        summary += `</tr>\n`;
      }
      summary += `</table>\n`;
    }
  }
  summary += `</body>\n</html>`;
  fs.writeFileSync(outputSummaryPath, summary);
  console.log("Summary written to", outputSummaryPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
