#!/usr/bin/env node
import fs from "fs";

function decodeHtmlEntities(input) {
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

const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage: node utils/decode-html-entities-in-file.mjs <file-path>");
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const raw = fs.readFileSync(filePath, "utf8");
const decoded = decodeHtmlEntities(raw);

if (decoded !== raw) {
  fs.writeFileSync(filePath, decoded, "utf8");
  console.log(`Decoded HTML entities in ${filePath}`);
} else {
  console.log(`No HTML entities found in ${filePath}`);
}
