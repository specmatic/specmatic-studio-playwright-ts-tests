#!/usr/bin/env node
// Aggregates per-run Playwright summaries into a single matrix summary table.

const fs = require("fs");
const path = require("path");

const artifactsRoot = process.env.MATRIX_ARTIFACTS_DIR || path.join(process.cwd(), "matrix-artifacts");
const outputPath =
  process.env.MATRIX_SUMMARY_OUTPUT_PATH ||
  path.join(process.cwd(), "playwright-report", "matrix-summary.md");
const jobSummaryPath = process.env.GITHUB_STEP_SUMMARY;

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function walkForSummaryJson(dirPath, matches = []) {
  if (!fs.existsSync(dirPath)) {
    return matches;
  }

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkForSummaryJson(fullPath, matches);
    } else if (entry.isFile() && entry.name === "failed-tests-summary.json") {
      matches.push(fullPath);
    }
  }

  return matches;
}

function renderFailureCell(items) {
  if (!items || items.length === 0) {
    return "None";
  }

  const lines = items.slice(0, 4).map((item) => {
    const specFile = escapeHtml(item.specFile || "Unknown Spec");
    const name = escapeHtml(item.name || "");
    return `<li><code>${specFile}</code><br>${name}</li>`;
  });

  if (items.length > 4) {
    lines.push(`<li>+${items.length - 4} more</li>`);
  }

  return `<ul>${lines.join("")}</ul>`;
}

function main() {
  const summaryFiles = walkForSummaryJson(artifactsRoot)
    .sort((left, right) => left.localeCompare(right))
    .map((filePath) => JSON.parse(fs.readFileSync(filePath, "utf8")));

  if (summaryFiles.length === 0) {
    console.error("No per-run summary JSON files found under", artifactsRoot);
    process.exit(1);
  }

  let markdown = `# Playwright Matrix Summary\n\n`;
  markdown += `<table>\n`;
  markdown += `<thead><tr><th>Run</th><th>Total</th><th>Passed</th><th>Failed</th><th>Errors</th><th>Expected Failures</th><th>Skipped</th><th>Unexpected Failures</th><th>Expected Failures List</th></tr></thead>\n`;
  markdown += `<tbody>\n`;

  for (const summary of summaryFiles) {
    markdown += "<tr>";
    markdown += `<td><strong>${escapeHtml(summary.runName)}</strong></td>`;
    markdown += `<td>${summary.stats.total}</td>`;
    markdown += `<td>${summary.stats.passed}</td>`;
    markdown += `<td>${summary.stats.failed}</td>`;
    markdown += `<td>${summary.stats.errored}</td>`;
    markdown += `<td>${summary.stats.expectedFailures}</td>`;
    markdown += `<td>${summary.stats.skipped}</td>`;
    markdown += `<td>${renderFailureCell(summary.unexpectedFailures)}</td>`;
    markdown += `<td>${renderFailureCell(summary.expectedFailures)}</td>`;
    markdown += "</tr>\n";
  }

  markdown += `</tbody>\n</table>\n`;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, markdown);

  if (jobSummaryPath) {
    fs.appendFileSync(jobSummaryPath, `${markdown}\n`);
  }
}

main();
