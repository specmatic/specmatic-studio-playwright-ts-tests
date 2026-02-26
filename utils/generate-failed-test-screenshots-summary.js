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
const artifactUrl = process.env.TEST_ARTIFACT_URL || "";

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

function isFailureLikeStatus(status) {
  return status === "failed" || status === "timedOut" || status === "interrupted";
}

function isExpectedFailure(test, finalStatus) {
  if (!test) {
    return false;
  }
  const expectedStatus = test.expectedStatus;
  return (
    isFailureLikeStatus(expectedStatus) &&
    isFailureLikeStatus(finalStatus) &&
    expectedStatus === finalStatus
  );
}

function getFinalResult(test) {
  const results = test?.results || [];
  if (results.length === 0) {
    return null;
  }
  return results[results.length - 1];
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
    errored = 0,
    expectedFailures = 0,
    skipped = 0;
  function collectStats(suites) {
    for (const suite of suites) {
      if (suite.specs) {
        for (const spec of suite.specs) {
          for (const test of spec.tests || []) {
            total++;
            const finalResult = getFinalResult(test);
            const finalStatus = finalResult?.status;
            if (isExpectedFailure(test, finalStatus)) expectedFailures++;
            else if (finalStatus === "failed") failed++;
            else if (
              finalStatus === "timedOut" ||
              finalStatus === "interrupted"
            )
              errored++;
            else if (finalStatus === "passed") passed++;
            else if (finalStatus === "skipped") skipped++;
          }
        }
      }
      if (suite.suites) collectStats(suite.suites);
    }
  }
  collectStats(report.suites || []);

  function toSummaryRecord(rawTest) {
    const [specFile, ...rest] = rawTest.name.split(" › ");
    return {
      specFile: normalizeSummaryText(specFile),
      name: normalizeSummaryText(rest.join(" › ")),
      screenshot: rawTest.screenshot,
      error: normalizeSummaryText(rawTest.error),
      status: rawTest.status,
      expectedFailure: rawTest.expectedFailure,
    };
  }

  function groupBySpec(tests) {
    const grouped = {};
    for (const test of tests) {
      if (!grouped[test.specFile]) grouped[test.specFile] = [];
      grouped[test.specFile].push(test);
    }
    return grouped;
  }

  // Get failed tests with screenshots and errors
  function getFailureBucketsWithDetails() {
    const unexpectedFailures = [];
    const expectedFailureTests = [];
    function walkSuites(suites, parentTitles = []) {
      for (const suite of suites) {
        const titles = [...parentTitles, suite.title];
        if (suite.specs) {
          for (const spec of suite.specs) {
            for (const test of spec.tests || []) {
              const finalResult = getFinalResult(test);
              if (!finalResult || !isFailureLikeStatus(finalResult.status)) {
                continue;
              }

              let screenshot = pickLastScreenshotPath(finalResult);
              if (!screenshot) {
                const failingResults = (test.results || []).filter((result) =>
                  isFailureLikeStatus(result.status),
                );
                for (let i = failingResults.length - 1; i >= 0; i--) {
                  screenshot = pickLastScreenshotPath(failingResults[i]);
                  if (screenshot) break;
                }
              }

              let error = extractFailureText(finalResult);
              if (!error) {
                const failingResults = (test.results || []).filter((result) =>
                  isFailureLikeStatus(result.status),
                );
                for (let i = failingResults.length - 1; i >= 0; i--) {
                  error = extractFailureText(failingResults[i]);
                  if (error) break;
                }
              }

              const record = {
                name: [...titles, spec.title].join(" › "),
                screenshot,
                error,
                status: finalResult.status,
                expectedFailure: isExpectedFailure(test, finalResult.status),
              };

              if (record.expectedFailure) {
                expectedFailureTests.push(record);
              } else {
                unexpectedFailures.push(record);
              }
            }
          }
        }
        if (suite.suites) walkSuites(suite.suites, titles);
      }
    }
    walkSuites(report.suites || []);
    return { unexpectedFailures, expectedFailureTests };
  }

  const { unexpectedFailures, expectedFailureTests } = getFailureBucketsWithDetails();
  const groupedUnexpected = groupBySpec(unexpectedFailures.map(toSummaryRecord));
  const groupedExpected = groupBySpec(expectedFailureTests.map(toSummaryRecord));

  // HTML output for better formatting and expand/collapse
  // Markdown output with collapsible sections and embedded screenshots
  let summary = `# Playwright Test Results Summary\n\n`;
  summary += `| Total | Passed | Failed | Errors | Expected Failures | Skipped |\n|-------|--------|--------|--------|-------------------|---------|\n| ${total} | ${passed} | ${failed} | ${errored} | ${expectedFailures} | ${skipped} |\n\n`;

  if (unexpectedFailures.length === 0 && expectedFailureTests.length === 0) {
    summary += `## No failed tests!\n`;
  } else {
    function appendGroupedTests(title, groupedTests) {
      const entries = Object.entries(groupedTests);
      if (entries.length === 0) {
        return;
      }

      summary += `<h2>${title}</h2>\n\n`;
      for (const [specFile, tests] of entries) {
        summary += `<details><summary><strong>${specFile}</strong></summary>\n`;
        for (const test of tests) {
          summary += `\n**${test.name}**\n`;
          summary += `_Status: ${test.status}${test.expectedFailure ? " (expected failure)" : ""}_\n`;
          if (test.screenshot) {
            if (artifactUrl) {
              summary += `[Screenshot Artifact](${artifactUrl})\n`;
            }
            summary += `\`Screenshot path: ${test.screenshot}\`\n`;
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

    appendGroupedTests("Unexpected Failures", groupedUnexpected);
    appendGroupedTests("Expected Failures", groupedExpected);
  }
  fs.writeFileSync(outputSummaryPath, summary);
  console.log("Summary written to", outputSummaryPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
