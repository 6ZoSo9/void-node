#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_PACKET_CLOSEOUT_HOLD_V1";
const SOURCE_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_PACKET_HOLD_V1";
const TERMINAL_ROLLUP_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_HOLD_V1";
const TERMINAL_ROLLUP_CLOSEOUT_FINAL_SEAL_INDEX_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_CLOSEOUT_FINAL_SEAL_INDEX_HOLD_V1";
const TERMINAL_ROLLUP_CLOSEOUT_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_CLOSEOUT_HOLD_V1";
const TERMINAL_ROLLUP_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_TERMINAL_ROLLUP_HOLD_V1";
const PRIOR_FINAL_SEAL_INDEX_CLOSEOUT_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_RECEIPT_CLOSEOUT_REVIEW_INDEX_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_HOLD_V1";

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

function validateOperatorHandoff(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("operator_handoff_packet_invalid");
  if (record.schema !== "void.datanet.wc.evidence_packet_ledger_append_scratch_preview_operator_handoff_packet.v1") {
    throw new Error("operator_handoff_packet_schema_mismatch");
  }
  expectMarker(record.marker, SOURCE_MARKER, "operator_handoff_packet");
  if (record.status !== "scratch_preview_operator_handoff_packet_ready_for_manual_review") {
    throw new Error("operator_handoff_packet_status_mismatch");
  }
  assertHex64(record.scratch_preview_operator_handoff_packet_id, "scratch_preview_operator_handoff_packet_id");
  assertNonEmpty(record.operator, "operator_handoff_operator");
  assertNonEmpty(record.review_window, "operator_handoff_review_window");
  assertNonEmpty(record.reason, "operator_handoff_reason");

  const source = record.terminal_rollup_closeout_final_seal_index_closeout || {};
  expectMarker(source.marker, TERMINAL_ROLLUP_CLOSEOUT_FINAL_SEAL_INDEX_CLOSEOUT_MARKER, "terminal_rollup_closeout_final_seal_index_closeout");
  assertHex64(source.scratch_preview_terminal_rollup_closeout_final_seal_index_closeout_id, "scratch_preview_terminal_rollup_closeout_final_seal_index_closeout_id");

  const finalSealIndex = record.terminal_rollup_closeout_final_seal_index || {};
  expectMarker(finalSealIndex.marker, TERMINAL_ROLLUP_CLOSEOUT_FINAL_SEAL_INDEX_MARKER, "terminal_rollup_closeout_final_seal_index");
  assertHex64(finalSealIndex.scratch_preview_terminal_rollup_closeout_final_seal_index_id, "scratch_preview_terminal_rollup_closeout_final_seal_index_id");

  const terminalRollupCloseout = record.terminal_rollup_closeout || {};
  expectMarker(terminalRollupCloseout.marker, TERMINAL_ROLLUP_CLOSEOUT_MARKER, "terminal_rollup_closeout");
  assertHex64(terminalRollupCloseout.scratch_preview_terminal_rollup_closeout_id, "scratch_preview_terminal_rollup_closeout_id");

  const terminalRollup = record.terminal_rollup || {};
  expectMarker(terminalRollup.marker, TERMINAL_ROLLUP_MARKER, "terminal_rollup");
  assertHex64(terminalRollup.scratch_preview_terminal_rollup_id, "scratch_preview_terminal_rollup_id");

  const priorFinalSealIndexCloseout = record.prior_final_seal_index_closeout || {};
  expectMarker(priorFinalSealIndexCloseout.marker, PRIOR_FINAL_SEAL_INDEX_CLOSEOUT_MARKER, "prior_final_seal_index_closeout");
  assertHex64(priorFinalSealIndexCloseout.scratch_apply_receipt_closeout_review_index_closeout_final_seal_index_closeout_id, "prior_final_seal_index_closeout_id");

  const chain = record.sealed_chain || {};
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
  ]) assertHex64(chain[key], key);
  assertNonEmpty(chain.work_id, "work_id");
  assertNonEmpty(chain.worker, "worker");

  const scratchLedger = record.scratch_ledger || {};
  for (const key of [
    "current_scratch_ledger_hash",
    "scratch_ledger_out_hash",
    "appended_line_hash",
    "logical_candidate_next_ledger_hash",
  ]) assertHex64(scratchLedger[key], key);

  const summary = record.handoff_summary || {};
  assertBool(summary.terminal_rollup_closeout_final_seal_index_closeout_bound, true, "terminal_rollup_closeout_final_seal_index_closeout_bound");
  assertBool(summary.fully_closed_scratch_preview_chain_bound_for_operator_review, true, "fully_closed_scratch_preview_chain_bound_for_operator_review");
  assertBool(summary.scratch_preview_operator_handoff_packet_only, true, "scratch_preview_operator_handoff_packet_only");
  assertBool(summary.operator_review_ready, true, "operator_review_ready");
  assertBool(summary.canonical_ledger_ready_for_later_manual_operator_decision_only, true, "canonical_ledger_ready_for_later_manual_operator_decision_only");
  assertBool(summary.canonical_ledger_append_performed, false, "canonical_ledger_append_performed");
  assertBool(summary.wc_issuance_performed, false, "wc_issuance_performed");
  assertBool(summary.wc_claim_performed, false, "wc_claim_performed");
  assertBool(summary.actual_wc_ledger_write_performed, false, "actual_wc_ledger_write_performed");

  const policy = record.work_credits_policy || {};
  assertBool(policy.useful_verifiable_work_only, true, "useful_verifiable_work_only");
  assertBool(policy.unlimited_uncapped_accounting_units, true, "unlimited_uncapped_accounting_units");
  assertBool(policy.finite_approved_amount_for_this_review, true, "finite_approved_amount_for_this_review");
  assertBool(policy.scratch_preview_operator_handoff_packet_only, true, "scratch_preview_operator_handoff_packet_only");

  const boundary = record.boundary || {};
  assertBool(boundary.scratch_preview_operator_handoff_packet_only, true, "scratch_preview_operator_handoff_packet_only");
  assertBool(boundary.terminal_rollup_closeout_final_seal_index_closeout_only_source, true, "terminal_rollup_closeout_final_seal_index_closeout_only_source");
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
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log("Usage: node tools/datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-handoff-packet-closeout.mjs --operator-handoff-packet <json> --out <json> --closer <name> --reason <text>");
    return;
  }

  const sourcePath = path.resolve(requireArg("operator-handoff-packet"));
  const outPath = path.resolve(requireArg("out"));
  const closer = requireArg("closer");
  const reason = requireArg("reason");
  assertNonEmpty(closer, "closer");
  assertNonEmpty(reason, "reason");

  const source = JSON.parse(await readFile(sourcePath, "utf8"));
  validateOperatorHandoff(source);

  const closeoutId = stableHashObject({
    source_id: source.scratch_preview_operator_handoff_packet_id,
    terminal_rollup_closeout_final_seal_index_closeout_id: source.terminal_rollup_closeout_final_seal_index_closeout.scratch_preview_terminal_rollup_closeout_final_seal_index_closeout_id,
    terminal_rollup_closeout_final_seal_index_id: source.terminal_rollup_closeout_final_seal_index.scratch_preview_terminal_rollup_closeout_final_seal_index_id,
    terminal_rollup_closeout_id: source.terminal_rollup_closeout.scratch_preview_terminal_rollup_closeout_id,
    terminal_rollup_id: source.terminal_rollup.scratch_preview_terminal_rollup_id,
    scratch_ledger_out_hash: source.scratch_ledger.scratch_ledger_out_hash,
    appended_line_hash: source.scratch_ledger.appended_line_hash,
    logical_candidate_next_ledger_hash: source.scratch_ledger.logical_candidate_next_ledger_hash,
    closer,
    reason,
  });

  const closeout = {
    schema: "void.datanet.wc.evidence_packet_ledger_append_scratch_preview_operator_handoff_packet_closeout.v1",
    marker: MARKER,
    status: "scratch_preview_operator_handoff_packet_closed_for_operator_review",
    scratch_preview_operator_handoff_packet_closeout_id: closeoutId,
    created_at: process.env.VOID_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_PACKET_CLOSEOUT_CREATED_AT || new Date().toISOString(),
    closer,
    reason,
    operator_handoff_packet: {
      path: sourcePath,
      marker: source.marker,
      scratch_preview_operator_handoff_packet_id: source.scratch_preview_operator_handoff_packet_id,
      operator: source.operator,
      review_window: source.review_window,
      reason: source.reason,
    },
    terminal_rollup_closeout_final_seal_index_closeout: source.terminal_rollup_closeout_final_seal_index_closeout,
    terminal_rollup_closeout_final_seal_index: source.terminal_rollup_closeout_final_seal_index,
    terminal_rollup_closeout: source.terminal_rollup_closeout,
    terminal_rollup: source.terminal_rollup,
    prior_final_seal_index_closeout: source.prior_final_seal_index_closeout,
    sealed_chain: source.sealed_chain,
    scratch_ledger: source.scratch_ledger,
    closeout_summary: {
      operator_handoff_packet_bound: true,
      fully_closed_scratch_preview_chain_handoff_closed_for_operator_review: true,
      scratch_preview_operator_handoff_packet_closeout_only: true,
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
      scratch_preview_operator_handoff_packet_closeout_only: true,
    },
    boundary: {
      scratch_preview_operator_handoff_packet_closeout_only: true,
      operator_handoff_packet_only_source: true,
      terminal_rollup_closeout_final_seal_index_closeout_only_source: true,
      terminal_rollup_closeout_final_seal_index_only_source: true,
      terminal_rollup_closeout_only_source: true,
      terminal_rollup_only_source: true,
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
  await writeFile(outPath, `${JSON.stringify(closeout, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(closeout, null, 2));
}

main().catch((err) => {
  console.error(`datanet_wc_evidence_packet_ledger_append_scratch_preview_operator_handoff_packet_closeout_error=${err.message}`);
  process.exit(1);
});
