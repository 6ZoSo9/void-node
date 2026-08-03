#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const MARKER = "VOID_AGENT_WORKING_AGREEMENT_V1";
const PROOF_MARKER = "VOID_AGENT_WORKING_AGREEMENT_V1_PROOF_GREEN=true";
const repo = path.resolve(process.cwd());
const agreementPath = path.join(repo, "AGENTS.md");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(fs.existsSync(agreementPath), "AGENTS.md is missing");
const stat = fs.lstatSync(agreementPath);
assert(stat.isFile(), "AGENTS.md must be a regular file");
assert(!stat.isSymbolicLink(), "AGENTS.md must not be a symlink");
assert(stat.size >= 4_000, "AGENTS.md is unexpectedly small");
assert(stat.size <= 20_000, "AGENTS.md is unexpectedly large");

const source = fs.readFileSync(agreementPath, "utf8");
const normalized = source.replace(/\s+/g, " ").trim();
assert(source.startsWith("# VOID repository working agreement for AI agents\n"), "title mismatch");
assert(source.endsWith("\n"), "AGENTS.md must end with a newline");
assert(!source.includes("\r"), "AGENTS.md must use LF line endings");
assert(!source.includes("\t"), "AGENTS.md must not contain tabs");
assert((source.match(new RegExp(MARKER, "g")) ?? []).length === 1, "marker count mismatch");

const orderedHeadings = [
  "## Mission",
  "## Default operating mode",
  "## Before changing files",
  "## Authority boundaries",
  "## Security requirements",
  "## Git and pull-request rules",
  "## Implementation quality",
  "## Validation",
  "## Pull-request evidence",
  "## Priority order",
  "## Completion rule",
];

let previousIndex = -1;
for (const heading of orderedHeadings) {
  const index = source.indexOf(heading);
  assert(index > previousIndex, `missing or out-of-order heading: ${heading}`);
  previousIndex = index;
}

const requiredSnippets = [
  "Preserve ZoSo as VOID's sovereign constitutional authority",
  "Repository work is source-only by default.",
  "A source commit or merged pull request is not a deployment",
  "Check that the planned paths do not overlap another active branch or open PR.",
  "On uncertainty or state drift, emit `HOLD` and stop before mutation.",
  "do not commit directly to `main`",
  "Never use `git add -A`, `git add .`,",
  "Do not force-push, rewrite shared history",
  "Open at most one pull request for the lane and create it as a draft by default.",
  "GitHub API commits are real remote commits.",
  "Node.js 22.x (`>=22 <23`).",
  "Do not hide repository-baseline failures.",
  "customer revenue, automatic fulfillment readiness, or verifiable receipts",
  "outside AI-agent discovery, authentication, capability negotiation",
  "Stop at the last authorized gate.",
];

for (const snippet of requiredSnippets) {
  const normalizedSnippet = snippet.replace(/\s+/g, " ").trim();
  assert(normalized.includes(normalizedSnippet), `required contract missing: ${snippet}`);
}

const explicitDeniedAuthorities = [
  "private keys",
  "deploy code",
  "access a wallet or signer",
  "write Work Credits",
  "change validator admission",
  "bypass a fresh operation-bound confirmation",
];
for (const boundary of explicitDeniedAuthorities) {
  assert(normalized.includes(boundary), `authority boundary missing: ${boundary}`);
}

const forbiddenClaims = [
  /agents may merge without authorization/i,
  /agents may deploy without authorization/i,
  /agents may move funds/i,
  /secrets may be committed/i,
  /force-push is permitted/i,
  /runtime is live when merged/i,
];
for (const pattern of forbiddenClaims) {
  assert(!pattern.test(normalized), `forbidden claim matched: ${pattern}`);
}

const lines = source.split("\n");
for (let index = 0; index < lines.length; index += 1) {
  assert(!/[ \t]+$/.test(lines[index]), `trailing whitespace at line ${index + 1}`);
}

const nodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10);
assert(nodeMajor === 22, `proof requires Node.js 22.x, observed ${process.versions.node}`);

console.log(`marker=${MARKER}`);
console.log(`agreement_path=${path.relative(repo, agreementPath)}`);
console.log(`agreement_bytes=${Buffer.byteLength(source, "utf8")}`);
console.log(`ordered_sections=${orderedHeadings.length}`);
console.log(`required_contracts=${requiredSnippets.length}`);
console.log(`explicit_denied_authorities=${explicitDeniedAuthorities.length}`);
console.log("source_only_default=true");
console.log("zo_sovereignty_preserved=true");
console.log("path_collision_guard_required=true");
console.log("merge_deploy_and_fund_authority_separate=true");
console.log(PROOF_MARKER);
