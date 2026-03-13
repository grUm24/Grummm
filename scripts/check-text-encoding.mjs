import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const TARGET_EXTENSIONS = new Set([
  ".md",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".html",
  ".yml",
  ".yaml",
  ".cs"
]);

const SKIP_PATH_PARTS = ["node_modules/", "dist/", "/bin/", "/obj/"];

// Catch classic UTF-8/CP1251 mojibake sequences and replacement-char artifacts.
const MOJIBAKE_RE = /(?:\u0420.|\u0421.){4,}|\u00D0|\u00D1|\u043F\u0457\u0455|\uFFFD|\u0432\u0402/;

function isTargetFile(path) {
  const lower = path.toLowerCase();
  if (SKIP_PATH_PARTS.some((part) => lower.includes(part))) {
    return false;
  }

  const dot = lower.lastIndexOf(".");
  if (dot < 0) {
    return false;
  }

  const ext = lower.slice(dot);
  return TARGET_EXTENSIONS.has(ext);
}

function listTrackedFiles() {
  const output = execSync("git ls-files", { encoding: "utf8" });
  return output.split(/\r?\n/).filter(Boolean);
}

function hasInvalidUtf8(buffer) {
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    return false;
  } catch {
    return true;
  }
}

function findProblems(files) {
  const issues = [];

  for (const path of files) {
    if (!isTargetFile(path)) {
      continue;
    }

    const data = readFileSync(path);

    if (hasInvalidUtf8(data)) {
      issues.push({ path, kind: "invalid-utf8" });
      continue;
    }

    const text = data.toString("utf8");
    if (MOJIBAKE_RE.test(text)) {
      issues.push({ path, kind: "mojibake-pattern" });
    }
  }

  return issues;
}

const files = listTrackedFiles();
const issues = findProblems(files);

if (issues.length === 0) {
  console.log("Encoding check passed.");
  process.exit(0);
}

console.error("Encoding check failed. Files requiring attention:");
for (const issue of issues) {
  console.error(`- ${issue.path} (${issue.kind})`);
}
process.exit(1);
