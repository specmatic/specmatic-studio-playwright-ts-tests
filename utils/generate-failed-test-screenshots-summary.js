#!/usr/bin/env node
// generate-failed-test-screenshots-summary.js
// This script parses Playwright JSON report and generates a Markdown summary
// with pass/fail counts plus failure details and screenshots.

const fs = require("fs");
const path = require("path");

const testResultsPath = path.join(
  __dirname,
  "../playwright-report/test-results.json",
);
const outputSummaryPath = path.join(
  __dirname,
  "../playwright-report/failed-tests-summary.md",
);

function decodeHtmlEntities(input) {
  if (!input) {
    return "";
  }

  const named = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };

  return input.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match, entity) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      const codePoint = parseInt(entity.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    if (entity.startsWith("#")) {
      const codePoint = parseInt(entity.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return named[entity] ?? match;
  });
}

function stripAnsi(input) {
  if (!input) {
    return "";
  }
  // Removes terminal color/control escape sequences that can show up in logs.
  return input.replace(/\u001b\[[0-9;]*m/g, "");
}

function normalizeSummaryText(input) {
  return decodeHtmlEntities(stripAnsi(input));
}

function pickLastScreenshotPath(result) {
  if (!result.attachments) {
    return null;
  }
  const pngs = result.attachments.filter(
    (a) => a && a.contentType === "image/png" && a.path,
  );
  if (pngs.length === 0) {
    return null;
  }
  return path.relative(path.join(__dirname, ".."), pngs[pngs.length - 1].path);
}

function extractTextAttachment(attachment) {
  if (!attachment || attachment.body == null) {
    return "";
  }

  if (typeof attachment.body === "string") {
    return attachment.body;
  }

  if (Array.isArray(attachment.body)) {
    return Buffer.from(attachment.body).toString("utf8");
  }

  return "";
}

function extractFailureText(result) {
  if (!result) {
    return "";
  }

  if (result.error) {
    if (result.error.message) {
      return result.error.message;
    }
    if (result.error.stack) {
      return result.error.stack;
    }
  }

  if (Array.isArray(result.errors) && result.errors.length > 0) {
    const normalized = result.errors
      .map((e) => {
        if (!e) return "";
        if (typeof e === "string") return e;
        return e.message || e.stack || "";
      })
      .filter(Boolean)
      .join("\n\n");
    if (normalized) {
      return normalized;
    }
  }

  if (Array.isArray(result.attachments)) {
    const textLogs = result.attachments
      .filter(
        (a) =>
          a &&
          (a.name === "stderr" ||
            a.name === "stdout" ||
            a.contentType === "text/plain"),
      )
      .map(extractTextAttachment)
      .filter(Boolean)
      .join("\n\n");
    if (textLogs) {
      return textLogs;
    }
  }

  return "";
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
                  const screenshot = pickLastScreenshotPath(result);
                  const error = extractFailureText(result);
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
    const normalizedSpecFile = normalizeSummaryText(specFile);
    if (!grouped[normalizedSpecFile]) grouped[normalizedSpecFile] = [];
    grouped[normalizedSpecFile].push({
      name: normalizeSummaryText(rest.join(" › ")),
      screenshot: test.screenshot,
      error: normalizeSummaryText(test.error),
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
      summary += `<details><summary><strong>${specFile}</strong></summary>\n`;
      for (const test of grouped[specFile]) {
        summary += `\n**${test.name}**\n`;
        if (test.screenshot) {
          summary += `![Screenshot](${test.screenshot})\n`;
        } else {
          summary += `_No screenshot found_\n`;
        }
        if (test.error) {
          const errorLines = test.error.split("\n");
          const previewLines = errorLines.slice(0, 8).join("\n");
          summary += `**Error (preview):**\n`;
          summary += "```\n" + previewLines + "\n";
          if (errorLines.length > 8) {
            summary += "...\n";
          }
          summary += "```\n";
          if (errorLines.length > 8) {
            summary += `<details><summary>Full Error</summary>\n`;
            summary += "```\n" + test.error + "\n```\n";
            summary += `</details>\n`;
          }
        } else {
          summary += `_No error message_\n`;
        }
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
