#!/usr/bin/env node

const artifactName = process.env.PREPARED_JAR_ARTIFACT_NAME;
const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const runId = process.env.GITHUB_RUN_ID;

if (!artifactName) {
  console.log("PREPARED_JAR_ARTIFACT_NAME is not set. Skipping artifact cleanup.");
  process.exit(0);
}

if (!token || !repository || !runId) {
  console.error("GITHUB_TOKEN, GITHUB_REPOSITORY, and GITHUB_RUN_ID are required.");
  process.exit(1);
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status}: ${body}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function main() {
  const [owner, repo] = repository.split("/");
  const artifacts = await request(
    `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/artifacts?per_page=100`,
  );

  const target = (artifacts.artifacts || []).find((artifact) => artifact.name === artifactName);
  if (!target) {
    console.log(`No artifact named '${artifactName}' was found for cleanup.`);
    return;
  }

  await request(
    `https://api.github.com/repos/${owner}/${repo}/actions/artifacts/${target.id}`,
    { method: "DELETE" },
  );

  console.log(`Deleted artifact '${artifactName}' (id=${target.id}).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
