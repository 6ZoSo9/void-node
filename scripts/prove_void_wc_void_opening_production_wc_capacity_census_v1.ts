#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  deriveAgentPaidWorkWcEarningAdapterPlanV1,
  materializeAgentPaidWorkWcEarningAdapterReceiptV1,
  validateAgentPaidWorkWcEarningAdapterReceiptV1,
} from "../src/economic/agent_paid_work_wc_earning_adapter_v1.js";

const ROOT = process.cwd();
const TOOL = path.join(
  ROOT,
  "scripts/void_wc_void_opening_production_wc_capacity_census_v1.ts",
);
const TSX = path.join(
  ROOT,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsx.cmd" : "tsx",
);
const h = (character: string): string => character.repeat(64);

function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", {
    mode: 0o600,
  });
}

function appendJsonl(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.appendFileSync(file, JSON.stringify(value) + "\n", {
    mode: 0o600,
  });
}

function adapterReceipt(
  suffix: string,
  account: string,
  overrides: { jobId?: string; receiptId?: string } = {},
) {
  const credentialId = `voidapwc1_${h(suffix)}`;
  const bindingId = `voidapwcb1_${h(suffix)}`;
  const registryId = `voidapwcbr1_${h(suffix)}`;
  const workOrderId = `voidawo1_${h(suffix)}`;
  const submissionReceiptId = `voidawsi1_${h(suffix)}`;
  const agentId = `void.agent.capacity-${suffix}`;

  const submissionReceipt = {
    marker: "VOID_AGENT_PAID_WORK_SUBMISSION_INTAKE_RECEIPT_V1",
    version: 1,
    receipt_id: submissionReceiptId,
    submission_id: `capacity-submission-${suffix}`,
    work_order_id: workOrderId,
    admission: { decision: "accepted_for_review" },
    authorization_verified: true,
    authentication: {
      mode: "credential_registry_v1",
      registry_id: `voidapwcr1_${h(suffix)}`,
      credential_id: credentialId,
      agent_id: agentId,
      scope: "agent-paid-work:submit-v1",
    },
    duplicate: false,
    authority: {
      provider_selected: false,
      quote_created: false,
      payment_authorized: false,
      work_execution_authorized: false,
      work_dispatched: false,
      wc_award_authorized: false,
      wc_ledger_write_authorized: false,
      mutation_authority_granted: false,
      wallet_or_signer_access_granted: false,
      buy_void_fulfillment_authority_granted: false,
    },
  };

  const workOrder = {
    marker: "VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1",
    version: 1,
    work_order_id: workOrderId,
    requester: { agent_id: agentId },
    service: { capability_id: "datanet.fetch_verify" },
  };

  const bindingRegistry = {
    registry_id: registryId,
    marker: "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_REGISTRY_V1",
    version: 1,
    updated_at: "2026-07-28T12:30:00.000Z",
    bindings: [
      {
        marker: "VOID_AGENT_PAID_WORK_CREDENTIAL_WC_ACCOUNT_BINDING_V1",
        binding_id: bindingId,
        credential_id: credentialId,
        agent_id: agentId,
        destination_wc_account: account,
        status: "active",
        valid_from: "2026-07-28T12:00:00.000Z",
        valid_until: "2026-08-28T12:00:00.000Z",
        revoked_at: null,
        uniqueness_key: `paid-work-credential-wc-account:${credentialId}`,
        authority: {
          paid_work_submission_identity: true,
          wc_award_destination: true,
          payment: false,
          wc_ledger_write: false,
          wc_to_void_settlement: false,
          wallet_or_signer: false,
        },
        source: {
          credential_registry_sha256: h("9"),
          review_decision_id: null,
          issuance_preparation_id: null,
        },
        created_at: "2026-07-28T12:00:00.000Z",
      },
    ],
  };

  const plan = deriveAgentPaidWorkWcEarningAdapterPlanV1({
    submission_receipt: submissionReceipt,
    work_order: workOrder,
    binding_registry: bindingRegistry,
    binding_registry_sha256: h("8"),
    selected_contract_capture_receipt_path:
      "/tmp/selected-adapter-contract-capture-receipt-v1.json",
    participant_cli_path:
      "/repo/ops/mainnet0/wc-public-earning-participant-v1.sh",
    pilot_source_path:
      "/repo/src/economic/wc_public_earning_pilot_v1.ts",
    acceptance_source_path:
      "/repo/src/economic/wc_verified_receipt_acceptance_v1.ts",
    ticket_path: `/tmp/capacity-ticket-${suffix}.json`,
    private_output_dir: `/tmp/capacity-adapter-${suffix}`,
    coordinator_base_url: "https://coordinator.example",
    coordinator_node_id: "0123456789abcdef0123456789abcdef",
    created_at_utc: "2026-07-28T12:30:00.000Z",
    expires_at_utc: "2026-07-28T12:40:00.000Z",
    nonce: `capacity-census-${suffix}`,
  });

  const participant = {
    marker: "VOID_WC_PUBLIC_EARNING_PARTICIPANT_CLI_V1",
    account,
    ticket_id: `ticket-capacity-${suffix}`,
    job_id: overrides.jobId || `job-capacity-${suffix}`,
    receipt_id: overrides.receiptId || `receipt-capacity-${suffix}`,
    token_sha256: h("7"),
    wc: {
      before: 0,
      after: 3,
      delta: 3,
      fixed_award_wc: 3,
    },
    remote_executor: true,
    signature_verified: true,
    remote_health_verified: true,
    remote_job_verified: true,
    remote_receipt_verified: true,
    capability_consumed: true,
    money_movement: false,
  };

  const receipt = materializeAgentPaidWorkWcEarningAdapterReceiptV1(
    plan,
    participant,
    {
      participant_receipt_path: `/tmp/participant-${suffix}.json`,
      participant_receipt_sha256: h("6"),
      participant_stdout_sha256: h("5"),
      participant_stderr_sha256: h("4"),
      ticket_deleted: true,
      recovered_from_existing_participant_receipt: false,
    },
    "2026-07-28T12:35:00.000Z",
  );
  validateAgentPaidWorkWcEarningAdapterReceiptV1(receipt);
  return receipt;
}

function ledgerCredit(receipt: any) {
  return {
    kind: "credit",
    account: receipt.participant.account,
    delta: 3,
    ts_ms: 1785242100000,
    reason: "verified_receipt_acceptance_v1",
    receipt_kind: "datanet_fetch_verify",
    receipt_id: receipt.participant.receipt_id,
    job_id: receipt.participant.job_id,
    dataset_id: "capacity-proof-dataset",
    input_hash: h("1"),
    output_hash: h("2"),
    reward_meta: {
      source: "wc_verified_receipt_acceptance_v1",
      policy: "useful_verifiable_only",
      server_controlled_award: true,
      fixed_award_wc: 3,
      persisted_receipt_verified: true,
      persisted_job_verified: true,
      persisted_completion_verified: true,
      verified_input_hash_match: true,
      duplicate_guard: ["receipt_id", "job_id"],
      capability_ticket_id: null,
      caller: "capacity-proof",
      accepted_at_ms: 1785242100000,
    },
  };
}

function run(dataDir: string, receiptRoot: string) {
  const result = spawnSync(
    TSX,
    [
      TOOL,
      "--data-dir",
      dataDir,
      "--receipt-root",
      receiptRoot,
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...process.env, NO_COLOR: "1" },
    },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return {
    raw: result.stdout,
    value: JSON.parse(result.stdout),
  };
}

function runFailure(
  dataDir: string,
  receiptRoot: string,
  pattern: RegExp,
): void {
  const result = spawnSync(
    TSX,
    [
      TOOL,
      "--data-dir",
      dataDir,
      "--receipt-root",
      receiptRoot,
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...process.env, NO_COLOR: "1" },
    },
  );
  assert.notEqual(result.status, 0, "expected census to fail closed");
  assert.match(result.stderr || result.stdout, pattern);
}

const censusSource = fs.readFileSync(TOOL, "utf8");
const productionVisibilitySource = fs.readFileSync(
  path.join(ROOT, "src/economic/wc_production_visibility_projection_v1.ts"),
  "utf8",
);
for (const token of [
  "0bd1367f924399b979c7ee9f001cd6edbeea2e35ded37283a0e4c10ba9aacbfb",
  "398291f147e64b5590b5467f68756df504aa0876bdcfd78abbd57b9ca49568f2",
]) {
  assert.ok(productionVisibilitySource.includes(token), `canonical compatibility missing: ${token}`);
  assert.ok(censusSource.includes(token), `census compatibility drift: ${token}`);
}
for (const source of [productionVisibilitySource, censusSource]) {
  assert.match(
    source,
    /VOID_WC_PRODUCTION_HISTORICAL_REPAIR_POSITION_V1\s*=\s*178\s*;/u,
    "canonical historical repair position drift",
  );
}

for (const token of [
  "O_NOFOLLOW",
  "fs.openSync(file, fs.constants.O_RDONLY | noFollow)",
  "fs.fstatSync(fd, { bigint: true })",
  "direct_file_changed_during_read",
  "dataInputStat.isSymbolicLink()",
  "inputStat.isSymbolicLink()",
]) {
  assert.ok(censusSource.includes(token), `secure read boundary missing: ${token}`);
}

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-wc-capacity-census-proof-"),
);
try {
  const dataDir = path.join(temp, "data");
  const receiptRoot = path.join(temp, "receipts");
  const ledger = path.join(dataDir, "wc_v1", "ledger.jsonl");
  const redeemed = path.join(dataDir, "wc_v1", "redeemed.jsonl");
  const accountA = "capacity-proof-account-a";
  const accountB = "capacity-proof-account-b";
  const receiptA = adapterReceipt("a", accountA);
  const receiptB = adapterReceipt("b", accountB);

  writeJson(
    path.join(receiptRoot, "a", "adapter-execution-receipt-v1.json"),
    receiptA,
  );
  writeJson(
    path.join(receiptRoot, "copy-a", "adapter-execution-receipt-v1.json"),
    receiptA,
  );
  writeJson(
    path.join(receiptRoot, "b", "adapter-execution-receipt-v1.json"),
    receiptB,
  );

  appendJsonl(ledger, ledgerCredit(receiptA));
  appendJsonl(ledger, ledgerCredit(receiptB));

  appendJsonl(ledger, {
    kind: "credit",
    account: accountA,
    delta: 5,
    ts_ms: 1785242101000,
    reason: "legacy_non_adapter_credit_v1",
  });
  appendJsonl(ledger, {
    kind: "debit",
    account: accountA,
    amount: 1,
    delta: -1,
    ts_ms: 1785242102000,
    reason: "capacity-proof-debit",
  });
  appendJsonl(redeemed, {
    account: accountA,
    amount: 0.5,
    ts_ms: 1785242103000,
    reason: "capacity-proof-redemption",
  });

  const clean = run(dataDir, receiptRoot);
  assert.equal(
    clean.value.marker,
    "VOID_WC_VOID_OPENING_PRODUCTION_WC_CAPACITY_CENSUS_V1",
  );
  assert.equal(clean.value.status, "PRODUCTION_WC_CAPACITY_OBSERVED_SCOPE_CLEAN");
  assert.equal(clean.value.discovery.adapter_receipt_files_seen, 3);
  assert.equal(clean.value.discovery.valid_unique_adapter_receipts, 2);
  assert.equal(clean.value.discovery.duplicate_adapter_receipt_copies, 1);
  assert.equal(clean.value.discovery.unreadable_directories, 0);
  assert.equal(
    clean.value.discovery.historical_known_compatibility_repairs_applied,
    0,
  );
  assert.equal(clean.value.discovery.depth_limited_directories, 0);
  assert.equal(clean.value.matched.production_earning_receipt_count, 2);
  assert.equal(clean.value.matched.distinct_wc_account_count, 2);
  assert.equal(clean.value.matched.gross_production_earned_wc, "6");
  assert.equal(
    clean.value.matched.all_source_redeemable_wc_on_matched_accounts,
    "9.5",
  );
  assert.equal(
    clean.value.matched.production_earned_redeemable_lower_bound_wc,
    "4.5",
  );
  assert.equal(
    clean.value.matched.production_earned_redeemable_upper_bound_wc,
    "6",
  );
  assert.equal(
    clean.value.matched.production_earned_redeemable_lower_bound_whole_wc,
    "4",
  );
  assert.equal(clean.value.matched.largest_account_gross_share_bps_ceiling, "5000");
  assert.equal(
    clean.value.matched.largest_account_lower_bound_share_bps_ceiling,
    "6667",
  );
  assert.equal(
    clean.value.matched
      .maximum_possible_account_share_bps_ceiling_under_attribution_uncertainty,
    "6667",
  );
  assert.equal(clean.value.credential_registry_access, false);
  assert.equal(clean.value.raw_token_access, false);
  assert.equal(clean.value.wc_ledger_mutation, false);
  assert.equal(clean.value.policy_selection_authorized, false);
  assert.equal(clean.raw.includes(accountA), false);
  assert.equal(clean.raw.includes(accountB), false);
  assert.equal(clean.raw.includes(temp), false);

  if (process.platform === "linux") {
    const receiptRootLink = path.join(temp, "receipt-root-link");
    fs.symlinkSync(receiptRoot, receiptRootLink, "dir");
    runFailure(dataDir, receiptRootLink, /receipt_root_invalid/u);

    const dataDirLink = path.join(temp, "data-dir-link");
    fs.symlinkSync(dataDir, dataDirLink, "dir");
    runFailure(dataDirLink, receiptRoot, /data_dir_invalid/u);
  }

  const receiptIdReuse = adapterReceipt(
    "c",
    "capacity-proof-account-c",
    { receiptId: receiptA.participant.receipt_id },
  );
  const receiptIdReuseFile = path.join(
    receiptRoot,
    "receipt-id-reuse",
    "adapter-execution-receipt-v1.json",
  );
  writeJson(receiptIdReuseFile, receiptIdReuse);
  runFailure(
    dataDir,
    receiptRoot,
    /adapter_receipt_duplicate_guard_conflict/u,
  );
  fs.rmSync(path.dirname(receiptIdReuseFile), {
    recursive: true,
    force: true,
  });

  const jobIdReuse = adapterReceipt(
    "d",
    "capacity-proof-account-d",
    { jobId: receiptA.participant.job_id },
  );
  const jobIdReuseFile = path.join(
    receiptRoot,
    "job-id-reuse",
    "adapter-execution-receipt-v1.json",
  );
  writeJson(jobIdReuseFile, jobIdReuse);
  runFailure(
    dataDir,
    receiptRoot,
    /adapter_receipt_duplicate_guard_conflict/u,
  );
  fs.rmSync(path.dirname(jobIdReuseFile), {
    recursive: true,
    force: true,
  });

  const ledgerBaseline = fs.readFileSync(ledger);

  fs.appendFileSync(ledger, "{historical-malformed-capacity-line}\\n");
  const malformedLedger = run(dataDir, receiptRoot);
  assert.equal(
    malformedLedger.value.status,
    "PRODUCTION_WC_CAPACITY_OBSERVED_WITH_DISCOVERY_GAPS",
  );
  assert.equal(
    malformedLedger.value.discovery.historical_malformed_ledger_lines_observed,
    1,
  );
  assert.equal(
    malformedLedger.value.discovery.historical_known_compatibility_repairs_applied,
    0,
  );
  assert.equal(malformedLedger.value.matched.gross_production_earned_wc, "6");
  fs.writeFileSync(ledger, ledgerBaseline);

  const conflictingReceiptCredit = ledgerCredit(receiptA);
  conflictingReceiptCredit.account = "capacity-proof-account-conflict";
  conflictingReceiptCredit.job_id = "job-capacity-conflict";
  appendJsonl(ledger, conflictingReceiptCredit);
  runFailure(dataDir, receiptRoot, /matching_ledger_credit_conflict/u);
  fs.writeFileSync(ledger, ledgerBaseline);

  const conflictingJobCredit = ledgerCredit(receiptA);
  conflictingJobCredit.account = "capacity-proof-account-conflict";
  conflictingJobCredit.receipt_id = "receipt-capacity-conflict";
  appendJsonl(ledger, conflictingJobCredit);
  runFailure(dataDir, receiptRoot, /matching_ledger_credit_conflict/u);
  fs.writeFileSync(ledger, ledgerBaseline);

  writeJson(
    path.join(receiptRoot, "invalid", "adapter-execution-receipt-v1.json"),
    { marker: "not-an-adapter-receipt" },
  );
  const partial = run(dataDir, receiptRoot);
  assert.equal(
    partial.value.status,
    "PRODUCTION_WC_CAPACITY_OBSERVED_WITH_DISCOVERY_GAPS",
  );
  assert.equal(partial.value.discovery.invalid_adapter_receipt_files, 1);
  assert.equal(partial.value.matched.gross_production_earned_wc, "6");

  const deepRoot = path.join(temp, "depth-limited-receipts");
  let deepCursor = deepRoot;
  fs.mkdirSync(deepCursor, { recursive: true, mode: 0o700 });
  for (let index = 0; index < 18; index += 1) {
    deepCursor = path.join(deepCursor, "level-" + String(index));
    fs.mkdirSync(deepCursor, { mode: 0o700 });
  }
  const depthLimited = run(dataDir, deepRoot);
  assert.equal(
    depthLimited.value.status,
    "PRODUCTION_WC_CAPACITY_OBSERVED_WITH_DISCOVERY_GAPS",
  );
  assert.ok(depthLimited.value.discovery.depth_limited_directories > 0);
  assert.equal(
    depthLimited.value.receipt_search_scope_authoritative,
    false,
  );
  assert.equal(depthLimited.raw.includes(accountA), false);
  assert.equal(depthLimited.raw.includes(accountB), false);
  assert.equal(depthLimited.raw.includes(deepRoot), false);

  if (process.platform === "linux") {
    const unreadableRoot = path.join(temp, "unreadable-receipts");
    const unreadableChild = path.join(unreadableRoot, "locked");
    fs.mkdirSync(unreadableChild, { recursive: true, mode: 0o700 });
    fs.chmodSync(unreadableChild, 0o000);
    try {
      const unreadable = run(dataDir, unreadableRoot);
      assert.equal(
        unreadable.value.status,
        "PRODUCTION_WC_CAPACITY_OBSERVED_WITH_DISCOVERY_GAPS",
      );
      assert.ok(unreadable.value.discovery.unreadable_directories > 0);
      assert.equal(
        unreadable.value.receipt_search_scope_authoritative,
        false,
      );
      assert.equal(unreadable.raw.includes(accountA), false);
      assert.equal(unreadable.raw.includes(accountB), false);
      assert.equal(unreadable.raw.includes(unreadableRoot), false);
    } finally {
      fs.chmodSync(unreadableChild, 0o700);
    }
  }

  console.log(
    "VOID_WC_VOID_OPENING_PRODUCTION_WC_CAPACITY_CENSUS_V1_PROOF_GREEN",
  );
  console.log("canonical_adapter_receipt_validation=true");
  console.log("canonical_receipt_job_duplicate_guard=true");
  console.log("canonical_wc_state_projection_reused=true");
  console.log("production_earned_lower_upper_bounds=true");
  console.log("known_historical_ledger_compatibility_bound=true");
  console.log("nofollow_receipt_read_boundary=true");
  console.log("symlink_root_rejection=true");
  console.log("malformed_ledger_discovery_gap_fail_closed=true");
  console.log("depth_limited_discovery_gap_fail_closed=true");
  console.log("unreadable_directory_discovery_gap_fail_closed=" + String(process.platform === "linux"));
  console.log("account_identifiers_not_emitted=true");
  console.log("credential_registry_access=false");
  console.log("wc_ledger_mutation=false");
  console.log("policy_selection_authorized=false");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
