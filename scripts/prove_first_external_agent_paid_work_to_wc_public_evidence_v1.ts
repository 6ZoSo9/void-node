#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dir = path.join(
  root,
  "docs/public-agent/evidence/first-external-agent-paid-work-to-wc-live-canary-v1",
);
const jsonPath = path.join(dir, "public-operator-evidence-v1.json");
const markdownPath = path.join(dir, "operator-verification-v1.md");
const checksumsPath = path.join(dir, "PUBLIC-SHA256SUMS.txt");

const milestoneId = "voidapwmil1_6f3345d7bed9598f3fdd8275715856d9fa3932beb427b7ccac1ce70ea5aa2cfb";
const ticketId = "e571c89a88dfc00b811983b4dda596d2";
const adapterReceiptId = "voidapwear1_ca2e39c12b96e00152637491433604aa06a20d996332b83b80b67ef3582bb7bb";
const token = /wcep1\.[0-9a-f]{32}\.[A-Za-z0-9_-]{20,200}/;
const privateHome = /\/home\/[^/\s]+\//;

function fail(message: string): never {
  throw new Error(message);
}

function sha256(file: string): string {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(file))
    .digest("hex");
}

for (const file of [jsonPath, markdownPath, checksumsPath]) {
  const metadata = fs.lstatSync(file);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    fail(`unsafe evidence file: ${file}`);
  }
  const text = fs.readFileSync(file, "utf8");
  if (token.test(text)) fail(`capability token found in public evidence: ${file}`);
  if (privateHome.test(text)) fail(`private home path found in public evidence: ${file}`);
}

const checksumEntries = fs
  .readFileSync(checksumsPath, "utf8")
  .trim()
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => {
    const match = line.match(/^([0-9a-f]{64})  (.+)$/);
    if (!match) fail(`invalid checksum line: ${line}`);
    return { expected: match[1], name: match[2] };
  });

const expectedNames = [
  "operator-verification-v1.md",
  "public-operator-evidence-v1.json",
].sort();
const observedNames = checksumEntries.map((entry) => entry.name).sort();

if (JSON.stringify(expectedNames) !== JSON.stringify(observedNames)) {
  fail(`checksum member set mismatch: ${JSON.stringify(observedNames)}`);
}

for (const entry of checksumEntries) {
  const file = path.join(dir, entry.name);
  if (sha256(file) !== entry.expected) fail(`checksum mismatch: ${entry.name}`);
}

const evidence = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

if (
  evidence.marker !==
    "VOID_FIRST_EXTERNAL_AGENT_PAID_WORK_TO_WC_PUBLIC_EVIDENCE_V1" ||
  evidence.version !== 1 ||
  evidence.milestone_id !== milestoneId ||
  evidence.ticket?.ticket_id !== ticketId ||
  evidence.ticket?.consumed_once !== true ||
  evidence.wc?.before !== 0 ||
  evidence.wc?.after !== 3 ||
  evidence.wc?.delta !== 3 ||
  evidence.adapter?.adapter_receipt_id !== adapterReceiptId ||
  evidence.adapter?.duplicate_finalization_verified !== true ||
  evidence.adapter?.duplicate_second_wc_credit !== false ||
  evidence.security?.capability_token_in_public_evidence !== false ||
  evidence.security?.token_artifact_scan_exact_green !== true
) {
  fail("public evidence semantic contract mismatch");
}

const markdown = fs.readFileSync(markdownPath, "utf8");

for (const literal of [
  milestoneId,
  ticketId,
  "WC transition: `0 → 3`",
  "Duplicate adapter finalization did not produce a second WC credit.",
]) {
  if (!markdown.includes(literal)) fail(`operator markdown missing: ${literal}`);
}

process.stdout.write(
  JSON.stringify(
    {
      marker:
        "VOID_FIRST_EXTERNAL_AGENT_PAID_WORK_TO_WC_PUBLIC_EVIDENCE_PROOF_V1",
      exact_green: true,
      milestone_id: milestoneId,
      ticket_id: ticketId,
      wc_delta: 3,
      duplicate_second_wc_credit: false,
      capability_token_present: false,
      private_home_path_present: false,
    },
    null,
    2,
  ) + "\n",
);
