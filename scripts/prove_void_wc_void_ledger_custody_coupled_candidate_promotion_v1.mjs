#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  VOID_WC_VOID_LEDGER_PERSISTENCE_AUTHORITY_V1,
  VOID_WC_VOID_LEDGER_PERSISTENCE_V1,
} from "../tools/void-wc-void-ledger-persistence-v1.mjs";
import {
  wcVoidLedgerPersistenceReviewBindingIdV1,
} from "../tools/void-wc-void-ledger-persistence-import-v1.mjs";
import {
  VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
} from "../tools/void-wc-void-coupled-opening-v1.mjs";
import {
  VOID_WC_VOID_LEDGER_CUSTODY_COUPLED_CANDIDATE_PROMOTION_AUTHORITY_V1,
  VOID_WC_VOID_LEDGER_CUSTODY_COUPLED_CANDIDATE_PROMOTION_V1,
  buildVoidWcVoidLedgerCustodyCoupledCandidatePromotionV1,
  readVoidWcVoidLedgerCustodyPromotionSourcesV1,
} from "../tools/void-wc-void-ledger-custody-coupled-candidate-promotion-v1.mjs";
import {
  classifyVoidCoupledEconomicSuccessorGateV1,
} from "../tools/void-coupled-economic-successor-gate-v1.mjs";

const ROOT = process.cwd();
const TOOL = path.join(
  ROOT,
  "tools/void-wc-void-ledger-custody-coupled-candidate-promotion-v1.mjs",
);
const CANDIDATE_FILE = path.join(
  ROOT,
  "ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json",
);
const SUCCESSOR_FILE = path.join(
  ROOT,
  "ops/mainnet0/economic-evm-successor-migration-candidate-v1.json",
);

function gitValue(args) {
  const result = spawnSync(
    "git",
    ["-C", ROOT, ...args],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        GIT_OPTIONAL_LOCKS: "0",
      },
    },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return String(result.stdout || "").trim();
}

const REPOSITORY_HEAD_SHA = gitValue(["rev-parse", "HEAD"]);
const REPOSITORY_TREE_SHA = gitValue(["rev-parse", "HEAD^{tree}"]);
assert.match(REPOSITORY_HEAD_SHA, /^[0-9a-f]{40}$/);
assert.match(REPOSITORY_TREE_SHA, /^[0-9a-f]{40}$/);
assert.equal(
  gitValue(["status", "--porcelain=v1", "--untracked-files=all"]),
  "",
);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function prettyBytes(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
}

function prettySha(value) {
  return sha256(prettyBytes(value));
}

function clone(value) {
  return structuredClone(value);
}

function rejects(fn, code) {
  assert.throws(
    fn,
    (error) => error instanceof Error && error.message === code,
    code,
  );
}

const candidate = JSON.parse(fs.readFileSync(CANDIDATE_FILE, "utf8"));
const successor = JSON.parse(fs.readFileSync(SUCCESSOR_FILE, "utf8"));
const launchId =
  candidate.shared_post_discovery_reconciliation.coupled_launch_id;

assert.match(launchId, /^sha256:[0-9a-f]{64}$/);

function importInput(coupledLaunchId = launchId) {
  const receipt = {
    ok: true,
    status: "PERSISTENCE_VERIFIED",
    marker: VOID_WC_VOID_LEDGER_PERSISTENCE_V1,
    version: 1,
    coupled_launch_id: coupledLaunchId,
    settlement_adapter_id:
      VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
    prestate_bytes: "0",
    observed_file_size_bytes: "4096",
    append_window_bytes: "512",
    append_window_sha256: "a".repeat(64),
    append_line_count: 2,
    opening_settlement_line_count: 1,
    expected_settlement_count: 1,
    settlement_set_root: "sha256:" + "b".repeat(64),
    total_settled_wc_units: "25",
    exact_expected_settlement_set_present: true,
    no_extra_opening_settlement_in_window: true,
    canonical_ledger_direct_file: true,
    canonical_ledger_realpath_exact: true,
    canonical_ledger_owner_bound: true,
    canonical_ledger_not_group_or_world_writable: true,
    prestate_line_boundary_verified: true,
    stable_file_identity_during_read: true,
    stable_parent_directory_identity_during_read: true,
    ledger_persistence_verified: true,
    quote_reserve_custody_verified: true,
    ledger_write_performed: false,
    wc_balance_mutation_performed: false,
    market_activation_authority: false,
    inventory_funding_authority: false,
    public_presale_activation_authority: false,
    funds_movement_authority: false,
    authority: clone(VOID_WC_VOID_LEDGER_PERSISTENCE_AUTHORITY_V1),
  };

  const expected = {
    coupled_launch_id: coupledLaunchId,
    settlement_adapter_id:
      VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_ID_V1,
    prestate_bytes: "0",
    settlement_set_root: receipt.settlement_set_root,
    total_settled_wc_units: receipt.total_settled_wc_units,
    expected_settlement_count: receipt.expected_settlement_count,
    binding_id: "voidwclprb1_" + "0".repeat(64),
  };
  expected.binding_id =
    wcVoidLedgerPersistenceReviewBindingIdV1(expected);

  return { expected, evidence: receipt };
}

function build(input = importInput(), candidateValue = candidate) {
  return buildVoidWcVoidLedgerCustodyCoupledCandidatePromotionV1({
    candidate: candidateValue,
    successorMigrationCandidate: successor,
    ledgerPersistenceImportInput: input,
    ledgerPersistenceImportInputFileSha256: prettySha(input),
    candidateFileSha256: prettySha(candidateValue),
    successorCandidateFileSha256: prettySha(successor),
    repositoryHeadSha: REPOSITORY_HEAD_SHA,
    repositoryTreeSha: REPOSITORY_TREE_SHA,
  });
}

assert.equal(
  VOID_WC_VOID_LEDGER_CUSTODY_COUPLED_CANDIDATE_PROMOTION_V1,
  "VOID_WC_VOID_LEDGER_CUSTODY_COUPLED_CANDIDATE_PROMOTION_V1",
);

const before = classifyVoidCoupledEconomicSuccessorGateV1(
  candidate,
  successor,
);
assert.equal(before.status, "HOLD");
assert.equal(
  before.missing_gates.includes(
    "wc_ledger_persistence_verification_required",
  ),
  true,
);
assert.equal(
  before.missing_gates.includes(
    "quote_reserve_custody_verification_required",
  ),
  true,
);

const promotion = build();
assert.equal(promotion.candidate_promotion_artifact_ready, true);
assert.equal(promotion.repository_head_sha, REPOSITORY_HEAD_SHA);
assert.equal(promotion.repository_tree_sha, REPOSITORY_TREE_SHA);
assert.match(promotion.promotion_id, /^voidwclccp1_[0-9a-f]{64}$/);
assert.match(
  promotion.ledger_persistence_import_id,
  /^voidwclpri1_[0-9a-f]{64}$/,
);
assert.equal(promotion.coupled_launch_id, launchId);
assert.equal(
  promotion.promoted_candidate.gates.wc_ledger_persistence_verified,
  true,
);
assert.equal(
  promotion.promoted_candidate.gates.quote_reserve_custody_verified,
  true,
);
assert.equal(
  promotion.promoted_candidate.gates.coupled_activation_ready,
  false,
);
assert.deepEqual(
  promotion.promoted_gates,
  [
    "quote_reserve_custody_verified",
    "wc_ledger_persistence_verified",
  ],
);
assert.equal(
  promotion.candidate_before.missing_gates.length
    - promotion.candidate_after.missing_gates.length,
  2,
);
assert.equal(
  promotion.candidate_after.missing_gates.includes(
    "wc_ledger_persistence_verification_required",
  ),
  false,
);
assert.equal(
  promotion.candidate_after.missing_gates.includes(
    "quote_reserve_custody_verification_required",
  ),
  false,
);
assert.equal(promotion.canonical_candidate_file_updated, false);
assert.equal(promotion.candidate_promotion_application_required, true);
assert.equal(promotion.coupled_activation_ready, false);
assert.equal(promotion.market_activation_authorized, false);
assert.equal(promotion.public_presale_activation_authorized, false);
assert.equal(promotion.funds_movement_authorized, false);
assert.deepEqual(
  promotion.authority,
  VOID_WC_VOID_LEDGER_CUSTODY_COUPLED_CANDIDATE_PROMOTION_AUTHORITY_V1,
);

const repeat = build();
assert.equal(repeat.promotion_id, promotion.promotion_id);
assert.equal(
  repeat.promoted_candidate_sha256,
  promotion.promoted_candidate_sha256,
);

{
  const otherLaunch =
    "sha256:" + (launchId.endsWith("0") ? "1" : "0").repeat(64);
  const wrongLaunch = importInput(otherLaunch);
  rejects(
    () => build(wrongLaunch),
    "promotion_coupled_launch_id_mismatch",
  );
}

{
  const badCandidate = clone(candidate);
  badCandidate.gates.wc_ledger_persistence_verified = true;
  rejects(
    () => build(importInput(), badCandidate),
    "promotion_candidate_prestate_invalid",
  );
}

{
  const bad = importInput();
  bad.evidence.quote_reserve_custody_verified = false;
  rejects(
    () => build(bad),
    "WC_VOID_LEDGER_PERSISTENCE_IMPORT_REQUIRED_PROOF_MISSING",
  );
}

{
  const good = importInput();
  rejects(
    () =>
      buildVoidWcVoidLedgerCustodyCoupledCandidatePromotionV1({
        candidate,
        successorMigrationCandidate: successor,
        ledgerPersistenceImportInput: good,
        ledgerPersistenceImportInputFileSha256: prettySha(good),
        candidateFileSha256: prettySha(candidate),
        successorCandidateFileSha256: prettySha(successor),
        repositoryHeadSha: "g".repeat(40),
        repositoryTreeSha: REPOSITORY_TREE_SHA,
      }),
    "promotion_repository_identity_invalid",
  );
}

{
  const good = importInput();
  const falseHead =
    (REPOSITORY_HEAD_SHA[0] === "0" ? "1" : "0")
    + REPOSITORY_HEAD_SHA.slice(1);
  rejects(
    () =>
      buildVoidWcVoidLedgerCustodyCoupledCandidatePromotionV1({
        candidate,
        successorMigrationCandidate: successor,
        ledgerPersistenceImportInput: good,
        ledgerPersistenceImportInputFileSha256: prettySha(good),
        candidateFileSha256: prettySha(candidate),
        successorCandidateFileSha256: prettySha(successor),
        repositoryHeadSha: falseHead,
        repositoryTreeSha: REPOSITORY_TREE_SHA,
      }),
    "promotion_repository_identity_mismatch",
  );
}

{
  const good = importInput();
  const falseTree =
    (REPOSITORY_TREE_SHA[0] === "0" ? "1" : "0")
    + REPOSITORY_TREE_SHA.slice(1);
  rejects(
    () =>
      buildVoidWcVoidLedgerCustodyCoupledCandidatePromotionV1({
        candidate,
        successorMigrationCandidate: successor,
        ledgerPersistenceImportInput: good,
        ledgerPersistenceImportInputFileSha256: prettySha(good),
        candidateFileSha256: prettySha(candidate),
        successorCandidateFileSha256: prettySha(successor),
        repositoryHeadSha: REPOSITORY_HEAD_SHA,
        repositoryTreeSha: falseTree,
      }),
    "promotion_repository_identity_mismatch",
  );
}

{
  const good = importInput();
  rejects(
    () =>
      buildVoidWcVoidLedgerCustodyCoupledCandidatePromotionV1({
        candidate,
        successorMigrationCandidate: successor,
        ledgerPersistenceImportInput: good,
        ledgerPersistenceImportInputFileSha256: "f".repeat(64),
        candidateFileSha256: prettySha(candidate),
        successorCandidateFileSha256: prettySha(successor),
        repositoryHeadSha: REPOSITORY_HEAD_SHA,
        repositoryTreeSha: REPOSITORY_TREE_SHA,
      }),
    "promotion_import_input_file_sha256_unbound",
  );
}

{
  const badCandidate = clone(candidate);
  badCandidate.authority.market_activation = true;
  assert.throws(
    () => build(importInput(), badCandidate),
  );
}

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-wc-ledger-custody-promotion-"),
);
try {
  fs.chmodSync(temp, 0o700);
  const inputFile = path.join(temp, "import-input.json");
  const outputFile = path.join(temp, "promotion.json");
  const input = importInput();
  fs.writeFileSync(inputFile, prettyBytes(input), { mode: 0o644 });

  rejects(
    () =>
      readVoidWcVoidLedgerCustodyPromotionSourcesV1({
        ledgerPersistenceImportInputFile: inputFile,
        ledgerPersistenceImportInputFileSha256: prettySha(input),
      }),
    "ledger_persistence_import_input_must_be_private",
  );

  fs.chmodSync(inputFile, 0o600);

  rejects(
    () =>
      readVoidWcVoidLedgerCustodyPromotionSourcesV1({
        ledgerPersistenceImportInputFile: inputFile,
        ledgerPersistenceImportInputFileSha256: "e".repeat(64),
      }),
    "ledger_persistence_import_input_sha256_mismatch",
  );

  const sources =
    readVoidWcVoidLedgerCustodyPromotionSourcesV1({
      ledgerPersistenceImportInputFile: inputFile,
      ledgerPersistenceImportInputFileSha256: prettySha(input),
    });
  assert.equal(
    sources.ledgerPersistenceImportInput.expected.coupled_launch_id,
    launchId,
  );
  assert.equal(sources.repositoryHeadSha, REPOSITORY_HEAD_SHA);
  assert.equal(sources.repositoryTreeSha, REPOSITORY_TREE_SHA);

  const cli = spawnSync(
    process.execPath,
    [
      TOOL,
      "prepare",
      "--import-input",
      inputFile,
      "--import-input-sha256",
      prettySha(input),
      "--output",
      outputFile,
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
    },
  );
  assert.equal(cli.status, 0, cli.stderr || cli.stdout);
  assert.match(
    cli.stdout,
    /VOID_WC_VOID_LEDGER_CUSTODY_COUPLED_CANDIDATE_PROMOTION_V1/u,
  );
  assert.match(
    cli.stdout,
    /canonical_candidate_file_updated=false/u,
  );
  assert.match(cli.stdout, /coupled_activation_ready=false/u);

  const outputStat = fs.statSync(outputFile);
  assert.equal(outputStat.mode & 0o077, 0);
  const output = JSON.parse(fs.readFileSync(outputFile, "utf8"));
  assert.equal(output.promotion_id, promotion.promotion_id);
  assert.equal(
    output.promoted_candidate.gates.wc_ledger_persistence_verified,
    true,
  );
  assert.equal(
    output.promoted_candidate.gates.quote_reserve_custody_verified,
    true,
  );

  const second = spawnSync(
    process.execPath,
    [
      TOOL,
      "prepare",
      "--import-input",
      inputFile,
      "--import-input-sha256",
      prettySha(input),
      "--output",
      outputFile,
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
    },
  );
  assert.notEqual(second.status, 0);
  assert.match(second.stderr, /promotion_output_already_exists/u);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

const source = fs.readFileSync(
  "tools/void-wc-void-ledger-custody-coupled-candidate-promotion-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "JsonRpcProvider(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "new Wallet(",
  "systemctl",
  "appendFileSync(",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_WC_VOID_LEDGER_CUSTODY_COUPLED_CANDIDATE_PROMOTION_V1_PROOF_GREEN",
);
console.log("existing_importer_recomputed=true");
console.log("clean_repository_generation_bound=true");
console.log("repository_head_tree_recorded=true");
console.log("repository_head_tree_independently_verified=true");
console.log("private_evidence_outside_repository=true");
console.log("coupled_launch_identity_bound=true");
console.log("reviewed_input_file_digest_bound=true");
console.log("private_descriptor_bound_input=true");
console.log("exact_two_gate_candidate_delta=true");
console.log("canonical_candidate_file_updated=false");
console.log("candidate_promotion_application_required=true");
console.log("coupled_activation_ready=false");
console.log("market_activation=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
