# This script reads the failed-tests-summary.md and appends its content to the GitHub Actions job summary using workflow commands.
import fs from 'fs';

const summaryPath = 'playwright-report/failed-tests-summary.md';

if (fs.existsSync(summaryPath)) {
  const summary = fs.readFileSync(summaryPath, 'utf-8');
  // Write to GitHub Actions summary (job summary)
  // See: https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#adding-a-job-summary
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
  console.log('Summary appended to GitHub Actions job summary.');
} else {
  console.error('Summary file not found:', summaryPath);
  process.exit(1);
}
