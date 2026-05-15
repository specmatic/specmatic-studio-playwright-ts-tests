#!/usr/bin/env node
// Generates a per-run Playwright summary and prepares a compact artifact payload.

const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..");
const testResultsPath = path.join(repoRoot, "playwright-report", "test-results.json");
const junitReportPath = path.join(repoRoot, "playwright-report", "junit-report.xml");
const outputSummaryPath = path.join(repoRoot, "playwright-report", "failed-tests-summary.md");
const outputJsonPath =
  process.env.PLAYWRIGHT_SUMMARY_JSON_PATH ||
  path.join(repoRoot, "playwright-report", "failed-tests-summary.json");
const artifactDir = process.env.PLAYWRIGHT_ARTIFACT_DIR || "";
const runName = process.env.PLAYWRIGHT_RUN_NAME || "Playwright Run";
const dockerLogsDir = process.env.PLAYWRIGHT_DOCKER_LOGS_DIR || "";

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
  return input.replace(/\u001b\[[0-9;]*m/g, "");
}

function normalizeSummaryText(input) {
  return decodeHtmlEntities(stripAnsi(input));
}

function fencedCode(text) {
  return "````\n" + (text || "") + "\n````\n";
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
    (attachment) => attachment && attachment.contentType === "image/png" && attachment.path,
  );
  if (pngs.length === 0) {
    return null;
  }
  return pngs[pngs.length - 1].path;
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
      .map((error) => {
        if (!error) return "";
        if (typeof error === "string") return error;
        return error.message || error.stack || "";
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
        (attachment) =>
          attachment &&
          (attachment.name === "stderr" ||
            attachment.name === "stdout" ||
            attachment.contentType === "text/plain"),
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

function walkReport(report) {
  let total = 0;
  let passed = 0;
  let failed = 0;
  let errored = 0;
  let expectedFailures = 0;
  let skipped = 0;
  const unexpectedFailures = [];
  const expectedFailureTests = [];

  function walkSuites(suites, parentTitles = []) {
    for (const suite of suites) {
      const titles = [...parentTitles, suite.title].filter(Boolean);
      if (suite.specs) {
        for (const spec of suite.specs) {
          for (const test of spec.tests || []) {
            total += 1;
            const finalResult = getFinalResult(test);
            const finalStatus = finalResult?.status;

            if (isExpectedFailure(test, finalStatus)) expectedFailures += 1;
            else if (finalStatus === "failed") failed += 1;
            else if (finalStatus === "timedOut" || finalStatus === "interrupted") errored += 1;
            else if (finalStatus === "passed") passed += 1;
            else if (finalStatus === "skipped") skipped += 1;

            if (!finalResult || !isFailureLikeStatus(finalStatus)) {
              continue;
            }

            let screenshotPath = pickLastScreenshotPath(finalResult);
            if (!screenshotPath) {
              const failingResults = (test.results || []).filter((result) =>
                isFailureLikeStatus(result.status),
              );
              for (let index = failingResults.length - 1; index >= 0; index -= 1) {
                screenshotPath = pickLastScreenshotPath(failingResults[index]);
                if (screenshotPath) {
                  break;
                }
              }
            }

            let errorText = extractFailureText(finalResult);
            if (!errorText) {
              const failingResults = (test.results || []).filter((result) =>
                isFailureLikeStatus(result.status),
              );
              for (let index = failingResults.length - 1; index >= 0; index -= 1) {
                errorText = extractFailureText(failingResults[index]);
                if (errorText) {
                  break;
                }
              }
            }

            const record = {
              specFile: normalizeSummaryText(path.relative(repoRoot, spec.file || "")),
              name: normalizeSummaryText([...titles, spec.title].filter(Boolean).join(" › ")),
              screenshot: screenshotPath ? path.resolve(screenshotPath) : null,
              error: normalizeSummaryText(errorText),
              status: finalStatus,
              expectedFailure: isExpectedFailure(test, finalStatus),
            };

            if (record.expectedFailure) {
              expectedFailureTests.push(record);
            } else {
              unexpectedFailures.push(record);
            }
          }
        }
      }
      if (suite.suites) {
        walkSuites(suite.suites, titles);
      }
    }
  }

  walkSuites(report.suites || []);

  return {
    stats: {
      total,
      passed,
      failed,
      errored,
      expectedFailures,
      skipped,
    },
    unexpectedFailures,
    expectedFailureTests,
  };
}

function formatFailureListForMarkdown(records) {
  if (!records.length) {
    return "_None_\n";
  }

  return records
    .map((record) => {
      let block = `- **${record.specFile || "Unknown Spec"}**: ${record.name}\n`;
      block += `  - Status: ${record.status}${record.expectedFailure ? " (expected failure)" : ""}\n`;
      if (record.screenshot) {
        block += `  - Screenshot: \`${record.screenshot}\`\n`;
      }
      if (record.error) {
        const lines = record.error.split("\n");
        block += "  - Error Preview:\n";
        block += fencedCode(lines.slice(0, 8).join("\n"));
      }
      return block;
    })
    .join("\n");
}

function copyFileIfExists(sourcePath, destinationPath) {
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    return;
  }
  ensureDir(path.dirname(destinationPath));
  fs.copyFileSync(sourcePath, destinationPath);
}

function copyDirectoryIfExists(sourceDir, destinationDir) {
  if (!sourceDir || !fs.existsSync(sourceDir)) {
    return;
  }
  if (path.resolve(sourceDir) === path.resolve(destinationDir)) {
    return;
  }
  fs.cpSync(sourceDir, destinationDir, { recursive: true });
}

function shortenFailureList(records) {
  return records.map((record) => ({
    specFile: record.specFile,
    name: record.name,
    screenshot: record.screenshot,
    status: record.status,
    expectedFailure: record.expectedFailure,
  }));
}

function prepareCompactArtifact(summaryData) {
  if (!artifactDir) {
    return summaryData;
  }

  ensureDir(artifactDir);
  const failureAssetsDir = path.join(artifactDir, "failure-assets");
  ensureDir(failureAssetsDir);

  let assetCounter = 0;
  function copyScreenshotIntoArtifact(record) {
    if (!record.screenshot || !fs.existsSync(record.screenshot)) {
      return null;
    }
    assetCounter += 1;
    const fileName = `${String(assetCounter).padStart(3, "0")}-${path.basename(record.screenshot)}`;
    const destinationPath = path.join(failureAssetsDir, fileName);
    fs.copyFileSync(record.screenshot, destinationPath);
    return path.posix.join("failure-assets", fileName);
  }

  for (const record of [...summaryData.unexpectedFailures, ...summaryData.expectedFailureTests]) {
    record.screenshot = copyScreenshotIntoArtifact(record);
  }

  copyFileIfExists(junitReportPath, path.join(artifactDir, "junit-report.xml"));
  if (dockerLogsDir) {
    copyDirectoryIfExists(dockerLogsDir, path.join(artifactDir, "docker-logs"));
  }

  return summaryData;
}

async function main() {
  let summaryData;

  if (!fs.existsSync(testResultsPath)) {
    summaryData = {
      stats: {
        total: 0,
        passed: 0,
        failed: 0,
        errored: 1,
        expectedFailures: 0,
        skipped: 0,
      },
      unexpectedFailures: [
        {
          specFile: "workflow/setup",
          name: "Playwright report was not generated",
          screenshot: null,
          error: `Playwright JSON report not found: ${testResultsPath}`,
          status: "interrupted",
          expectedFailure: false,
        },
      ],
      expectedFailureTests: [],
    };
  } else {
    const report = JSON.parse(fs.readFileSync(testResultsPath, "utf8"));
    summaryData = walkReport(report);
  }

  prepareCompactArtifact(summaryData);

  let summary = `# ${runName} Playwright Summary\n\n`;
  summary += `| Total | Passed | Failed | Errors | Expected Failures | Skipped |\n`;
  summary += `|-------|--------|--------|--------|-------------------|---------|\n`;
  summary += `| ${summaryData.stats.total} | ${summaryData.stats.passed} | ${summaryData.stats.failed} | ${summaryData.stats.errored} | ${summaryData.stats.expectedFailures} | ${summaryData.stats.skipped} |\n\n`;

  summary += `## Unexpected Failures\n\n`;
  summary += formatFailureListForMarkdown(summaryData.unexpectedFailures);
  summary += `\n## Expected Failures\n\n`;
  summary += formatFailureListForMarkdown(summaryData.expectedFailureTests);

  fs.writeFileSync(outputSummaryPath, summary);

  const jsonPayload = {
    runName,
    stats: summaryData.stats,
    unexpectedFailures: shortenFailureList(summaryData.unexpectedFailures),
    expectedFailures: shortenFailureList(summaryData.expectedFailureTests),
  };
  fs.writeFileSync(outputJsonPath, `${JSON.stringify(jsonPayload, null, 2)}\n`);

  if (artifactDir) {
    copyFileIfExists(outputSummaryPath, path.join(artifactDir, "failed-tests-summary.md"));
    copyFileIfExists(outputJsonPath, path.join(artifactDir, "failed-tests-summary.json"));
  }

  console.log("Summary written to", outputSummaryPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
