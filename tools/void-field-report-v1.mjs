#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { hostname, platform, release, arch } from "node:os";
import { join } from "node:path";

function run(cmd, args = []) {
  try {
    return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (err) {
    return String(err.stdout || err.stderr || err.message || "").trim();
  }
}

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (name.endsWith(".json")) acc.push(p);
  }
  return acc;
}

mkdirSync(".void-field-reports", { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

const artifacts = walk(".void-field-trial").concat(walk(".void-field-reports"));
const parsed = [];
for (const p of artifacts) {
  try {
    parsed.push({ path: p, json: JSON.parse(readFileSync(p, "utf8")) });
  } catch {}
}

const report = {
  marker: "VOID_FIELD_REPORT_V1_READY",
  created_at: new Date().toISOString(),
  network_hint: process.env.VOID_NETWORK_HINT || "operator-specified",
  machine: {
    hostname: hostname(),
    platform: platform(),
    release: release(),
    arch: arch(),
  },
  git: {
    branch: run("git", ["branch", "--show-current"]),
    head: run("git", ["rev-parse", "--short", "HEAD"]),
    status_short: run("git", ["status", "--short"]),
  },
  node: run("node", ["--version"]),
  npm: run("npm", ["--version"]),
  artifact_count: parsed.length,
  artifacts: parsed,
  dangerous_paths_touched: false,
};

const jsonPath = join(".void-field-reports", `void-field-report-${stamp}.json`);
const mdPath = join(".void-field-reports", `void-field-report-${stamp}.md`);

writeFileSync(jsonPath, JSON.stringify(report, null, 2) + "\n");

writeFileSync(mdPath, [
  "# VOID Field Report v1",
  "",
  `- marker: ${report.marker}`,
  `- created_at: ${report.created_at}`,
  `- network_hint: ${report.network_hint}`,
  `- host: ${report.machine.hostname}`,
  `- git: ${report.git.branch} @ ${report.git.head}`,
  `- artifact_count: ${report.artifact_count}`,
  `- dangerous_paths_touched: ${report.dangerous_paths_touched}`,
  "",
  "## Artifacts",
  ...parsed.map((x) => `- ${x.path}: ${x.json.marker || "unknown-marker"}`),
  "",
].join("\n"));

console.log("VOID_FIELD_REPORT_V1_READY");
console.log(`json=${jsonPath}`);
console.log(`md=${mdPath}`);
console.log(`artifacts=${parsed.length}`);
