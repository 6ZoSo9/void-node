#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_TERMINAL_ROLLUP_HOLD_V1";
const SOURCE_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_PACKET_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_HOLD_V1";
const FINAL_SEAL_INDEX_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_PACKET_CLOSEOUT_FINAL_SEAL_INDEX_HOLD_V1";
const OPERATOR_HANDOFF_CLOSEOUT_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_PACKET_CLOSEOUT_HOLD_V1";
const OPERATOR_HANDOFF_PACKET_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_PACKET_HOLD_V1";

function getArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}
function requireArg(name) {
  const value = getArg(name);
  if (!value || value.startsWith("--")) throw new Error(`Missing required --${name}`);
  return value;
}
function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
function stableHashObject(value) {
  return sha256(JSON.stringify(value));
}
function assertBool(value, expected, label) {
  if (value !== expected) throw new Error(`${label}_boundary_mismatch`);
}
function assertHex64(value, label) {
  if (!/^[0-9a-f]{64}$/.test(value || "")) throw new Error(`${label}_invalid`);
}
function assertNonEmpty(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label}_missing`);
}
function expectMarker(value, expected, label) {
  if (value !== expected) throw new Error(`${label}_marker_mismatch`);
}
function maybeHex(value, label) {
  if (value !== undefined && value !== null) assertHex64(value, label);
}

function validateSource(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("operator_handoff_packet_closeout_final_seal_index_closeout_invalid");
  }
  if (record.schema !== "void.datanet.wc.evidence_packet_ledger_append_scratch_preview_operator_handoff_packet_closeout_final_seal_index_closeout.v1") {
    throw new Error("operator_handoff_packet_closeout_final_seal_index_closeout_schema_mismatch");
  }
  expectMarker(record.marker, SOURCE_MARKER, "operator_handoff_packet_closeout_final_seal_index_closeout");
  if (record.status !== "scratch_preview_operator_handoff_packet_closeout_final_seal_index_closed_for_operator_review") {
    throw new Error("operator_handoff_packet_closeout_final_seal_index_closeout_status_mismatch");
  }

  assertHex64(
    record.scratch_preview_operator_handoff_packet_closeout_final_seal_index_closeout_id,
    "scratch_preview_operator_handoff_packet_closeout_final_seal_index_closeout_id"
  );
  assertNonEmpty(record.closer, "source_closeout_closer");
  assertNonEmpty(record.reason, "source_closeout_reason");

  const finalSealIndex = record.source_final_seal_index || {};
  expectMarker(finalSealIndex.marker, FINAL_SEAL_INDEX_MARKER, "source_final_seal_index");
  assertHex64(
    finalSealIndex.scratch_preview_operator_handoff_packet_closeout_final_seal_index_id,
    "source_final_seal_index_id"
  );

  const operatorCloseout = record.source_operator_handoff_packet_closeout || {};
  expectMarker(operatorCloseout.marker, OPERATOR_HANDOFF_CLOSEOUT_MARKER, "source_operator_handoff_packet_closeout");
  assertHex64(operatorCloseout.scratch_preview_operator_handoff_packet_closeout_id, "source_operator_handoff_packet_closeout_id");

  const operatorHandoff = record.operator_handoff_packet || {};
  expectMarker(operatorHandoff.marker, OPERATOR_HANDOFF_PACKET_MARKER, "operator_handoff_packet");
  assertHex64(operatorHandoff.scratch_preview_operator_handoff_packet_id, "operator_handoff_packet_id");

  const summary = record.closeout_summary || {};
  assertBool(summary.operator_handoff_packet_closeout_final_seal_index_bound, true, "operator_handoff_packet_closeout_final_seal_index_bound");
  assertBool(summary.scratch_preview_operator_handoff_packet_closeout_final_seal_index_closeout_only, true, "scratch_preview_operator_handoff_packet_closeout_final_seal_index_closeout_only");
  assertBool(summary.canonical_ledger_append_performed, false, "canonical_ledger_append_performed");
  assertBool(summary.wc_issuance_performed, false, "wc_issuance_performed");
  assertBool(summary.wc_claim_performed, false, "wc_claim_performed");
  assertBool(summary.actual_wc_ledger_write_performed, false, "actual_wc_ledger_write_performed");

  const boundary = record.boundary || {};
  assertBool(boundary.scratch_preview_operator_handoff_packet_closeout_final_seal_index_closeout_only, true, "source_closeout_only");
  assertBool(boundary.scratch_preview_chain_review_only, true, "scratch_preview_chain_review_only");
  assertBool(boundary.canonical_ledger_append_performed, false, "canonical_ledger_append_performed");
  for (const key of [
    "wc_issuance_enabled",
    "wc_claim_enabled",
    "wc_ledger_write_enabled",
    "void_transfer_enabled",
    "usdc_transfer_enabled",
    "wallet_connection_enabled",
    "signer_access_enabled",
    "network_submit_enabled",
    "public_mutation_enabled",
  ]) assertBool(boundary[key], false, key);

  const policy = record.work_credits_policy || {};
  assertBool(policy.useful_verifiable_work_only, true, "useful_verifiable_work_only");
  assertBool(policy.unlimited_uncapped_accounting_units, true, "unlimited_uncapped_accounting_units");
  assertBool(policy.finite_approved_amount_for_this_review, true, "finite_approved_amount_for_this_review");

  const sealedChain = record.sealed_chain || {};
  for (const key of [
    "final_seal_index_id",
    "review_index_closeout_id",
    "review_index_id",
    "receipt_closeout_id",
    "receipt_id",
    "scratch_apply_id",
    "execute_packet_id",
    "dry_run_id",
    "ledger_write_packet_id",
    "evidence_hash",
  ]) maybeHex(sealedChain[key], `sealed_chain_${key}`);

  const scratchLedger = record.scratch_ledger || {};
  for (const key of [
    "current_scratch_ledger_hash",
    "scratch_ledger_out_hash",
    "appended_line_hash",
    "logical_candidate_next_ledger_hash",
  ]) assertHex64(scratchLedger[key], key);
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log("Usage: node tools/datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-handoff-terminal-rollup.mjs --operator-handoff-final-seal-index-closeout <json> --out <json> --operator <name> --reason <text>");
    return;
  }

  const sourcePath = path.resolve(requireArg("operator-handoff-final-seal-index-closeout"));
  const outPath = path.resolve(requireArg("out"));
  const operator = requireArg("operator");
  const reason = requireArg("reason");
  assertNonEmpty(operator, "operator");
  assertNonEmpty(reason, "reason");

  const source = JSON.parse(await readFile(sourcePath, "utf8"));
  validateSource(source);

  const terminalRollupId = stableHashObject({
    source_closeout_id: source.scratch_preview_operator_handoff_packet_closeout_final_seal_index_closeout_id,
    source_final_seal_index_id: source.source_final_seal_index.scratch_preview_operator_handoff_packet_closeout_final_seal_index_id,
    source_operator_handoff_closeout_id: source.source_operator_handoff_packet_closeout.scratch_preview_operator_handoff_packet_closeout_id,
    operator_handoff_packet_id: source.operator_handoff_packet.scratch_preview_operator_handoff_packet_id,
    scratch_ledger_out_hash: source.scratch_ledger.scratch_ledger_out_hash,
    appended_line_hash: source.scratch_ledger.appended_line_hash,
    logical_candidate_next_ledger_hash: source.scratch_ledger.logical_candidate_next_ledger_hash,
    operator,
    reason,
  });

  const rollup = {
    schema: "void.datanet.wc.evidence_packet_ledger_append_scratch_preview_operator_handoff_terminal_rollup.v1",
    marker: MARKER,
    status: "scratch_preview_operator_handoff_terminal_rollup_ready_for_operator_review",
    scratch_preview_operator_handoff_terminal_rollup_id: terminalRollupId,
    created_at: process.env.VOID_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_TERMINAL_ROLLUP_CREATED_AT || new Date().toISOString(),
    operator,
    reason,
    source_operator_handoff_packet_closeout_final_seal_index_closeout: {
      path: sourcePath,
      marker: source.marker,
      scratch_preview_operator_handoff_packet_closeout_final_seal_index_closeout_id:
        source.scratch_preview_operator_handoff_packet_closeout_final_seal_index_closeout_id,
      closer: source.closer,
      reason: source.reason,
    },
    source_final_seal_index: source.source_final_seal_index,
    source_operator_handoff_packet_closeout: source.source_operator_handoff_packet_closeout,
    operator_handoff_packet: source.operator_handoff_packet,
    terminal_rollup_closeout_final_seal_index_closeout: source.terminal_rollup_closeout_final_seal_index_closeout,
    terminal_rollup_closeout_final_seal_index: source.terminal_rollup_closeout_final_seal_index,
    terminal_rollup_closeout: source.terminal_rollup_closeout,
    terminal_rollup: source.terminal_rollup,
    prior_final_seal_index_closeout: source.prior_final_seal_index_closeout,
    sealed_chain: source.sealed_chain,
    scratch_ledger: source.scratch_ledger,
    terminal_summary: {
      operator_handoff_packet_closeout_final_seal_index_closeout_bound: true,
      scratch_preview_operator_handoff_terminal_rollup_only: true,
      fully_closed_scratch_preview_operator_handoff_chain_rollup: true,
      operator_review_ready: true,
      canonical_ledger_ready_for_later_manual_operator_decision_only: true,
      canonical_ledger_append_performed: false,
      wc_issuance_performed: false,
      wc_claim_performed: false,
      actual_wc_ledger_write_performed: false,
    },
    work_credits_policy: {
      useful_verifiable_work_only: true,
      unlimited_uncapped_accounting_units: true,
      finite_approved_amount_for_this_review: true,
      scratch_preview_operator_handoff_terminal_rollup_only: true,
    },
    boundary: {
      scratch_preview_operator_handoff_terminal_rollup_only: true,
      source_operator_handoff_packet_closeout_final_seal_index_closeout_only: true,
      scratch_preview_chain_review_only: true,
      canonical_ledger_append_performed: false,
      wc_issuance_enabled: false,
      wc_claim_enabled: false,
      wc_ledger_write_enabled: false,
      void_transfer_enabled: false,
      usdc_transfer_enabled: false,
      wallet_connection_enabled: false,
      signer_access_enabled: false,
      network_submit_enabled: false,
      public_mutation_enabled: false,
    },
  };

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(rollup, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(rollup, null, 2));
}

main().catch((err) => {
  console.error(`datanet_wc_evidence_packet_ledger_append_scratch_preview_operator_handoff_terminal_rollup_error=${err.message}`);
  process.exit(1);
});
