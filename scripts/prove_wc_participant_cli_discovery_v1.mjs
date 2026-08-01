#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => fs.readFileSync(path.join(ROOT, name), "utf8");
const count = (text, needle) => text.split(needle).length - 1;

const publicIndex = read("docs/public/README.md");
const onboarding = read("docs/public/participant-onboarding.md");
const releaseDoc = read(
  "docs/public/wc-public-earning-participant-cli-release-pack-v1.md",
);
const workflow = read(
  ".github/workflows/wc-participant-cli-discovery-v1.yml",
);
const onboardingWords = onboarding.replace(/\s+/gu, " ");
const releaseWords = releaseDoc.replace(/\s+/gu, " ");

const releaseHref = "wc-public-earning-participant-cli-release-pack-v1.md";
assert.equal(count(publicIndex, releaseHref), 1);
assert.equal(count(onboarding, releaseHref), 1);

for (const required of [
  "[Public Earn No-Node Client v1](void-public-earn-no-node-client-v1.md)",
  "[Local-executor participant CLI release pack]",
  "Current public earning remains a bounded, coordinator-issued, capability-ticket pilot.",
]) {
  assert.ok(publicIndex.includes(required), `public index missing: ${required}`);
}

for (const required of [
  "[VOID Public Earn No-Node Client v1](void-public-earn-no-node-client-v1.md)",
  "Participants who already operate a compatible local VOID executor",
  "does not install or enable an executor",
  "issue a ticket",
  "write WC",
  "settle WC to VOID",
  "move funds",
]) {
  assert.ok(onboardingWords.includes(required), `onboarding missing: ${required}`);
}

for (const required of [
  "WC_PUBLIC_EARNING_PARTICIPANT_CLI_RELEASE_PACK_V1",
  "compatible local VOID executor endpoint",
  "a fresh ticket",
  "exact trusted coordinator base and node ID",
  "archive is deterministic",
]) {
  assert.ok(releaseWords.includes(required), `release documentation missing: ${required}`);
}

for (const required of [
  "permissions:\n  contents: read",
  "persist-credentials: false",
  'node-version: "22"',
  "node --check scripts/prove_wc_participant_cli_discovery_v1.mjs",
  "node scripts/prove_wc_participant_cli_discovery_v1.mjs",
]) {
  assert.ok(workflow.includes(required), `workflow missing: ${required}`);
}
assert.equal(workflow.includes("contents: write"), false);

console.log("WC_PARTICIPANT_CLI_DISCOVERY_V1_PROOF_GREEN");
console.log("release_pack_linked_from_public_index=true");
console.log("release_pack_linked_from_participant_onboarding=true");
console.log("no_node_path_preserved=true");
console.log("local_executor_requirement_disclosed=true");
console.log("ticket_requirement_disclosed=true");
console.log("ticket_issuance=false");
console.log("work_execution=false");
console.log("wc_ledger_write=false");
console.log("settlement_execution=false");
console.log("wallet_or_signer_access=false");
console.log("deployment=false");
console.log("fund_movement=false");
