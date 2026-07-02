#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_PACKET_CLOSEOUT_FINAL_SEAL_INDEX_HOLD_V1";
const SOURCE_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_PACKET_CLOSEOUT_HOLD_V1";
const OPERATOR_HANDOFF_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_PACKET_HOLD_V1";

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

function validateSource(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("operator_handoff_packet_closeout_invalid");
  if (record.schema !== "void.datanet.wc.evidence_packet_ledger_append_scratch_preview_operator_handoff_packet_closeout.v1") {
    throw new Error("operator_handoff_packet_closeout_schema_mismatch");
  }
  expectMarker(record.marker, SOURCE_MARKER, "operator_handoff_packet_closeout");
  if (record.status !== "scratch_preview_operator_handoff_packet_closed_for_operator_review") {
    throw new Error("operator_handoff_packet_closeout_status_mismatch");
  }
  assertHex64(record.scratch_preview_operator_handoff_packet_closeout_id, "scratch_preview_operator_handoff_packet_closeout_id");
  assertNonEmpty(record.closer, "operator_handoff_packet_closeout_closer");
  assertNonEmpty(record.reason, "operator_handoff_packet_closeout_reason");

  const handoff = record.operator_handoff_packet || {};
  expectMarker(handoff.marker, OPERATOR_HANDOFF_MARKER, "operator_handoff_packet");
  assertHex64(handoff.scratch_preview_operator_handoff_packet_id, "scratch_preview_operator_handoff_packet_id");

  const summary = record.closeout_summary || {};
  assertBool(summary.operator_handoff_packet_bound, true, "operator_handoff_packet_bound");
  assertBool(summary.scratch_preview_operator_handoff_packet_closeout_only, true, "scratch_preview_operator_handoff_packet_closeout_only");
  assertBool(summary.operator_review_ready, true, "operator_review_ready");
  assertBool(summary.canonical_ledger_append_performed, false, "canonical_ledger_append_performed");
  assertBool(summary.wc_issuance_performed, false, "wc_issuance_performed");
  assertBool(summary.wc_claim_performed, false, "wc_claim_performed");
  assertBool(summary.actual_wc_ledger_write_performed, false, "actual_wc_ledger_write_performed");

  const boundary = record.boundary || {};
  assertBool(boundary.scratch_preview_operator_handoff_packet_closeout_only, true, "scratch_preview_operator_handoff_packet_closeout_only");
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
    console.log("Usage: node tools/datanet-wc-evidence-packet-ledger-append-scratch-preview-operator-handoff-packet-closeout-final-seal-index.mjs --operator-handoff-packet-closeout <json> --out <json> --sealer <name> --reason <text>");
    return;
  }

  const sourcePath = path.resolve(requireArg("operator-handoff-packet-closeout"));
  const outPath = path.resolve(requireArg("out"));
  const sealer = requireArg("sealer");
  const reason = requireArg("reason");
  assertNonEmpty(sealer, "sealer");
  assertNonEmpty(reason, "reason");

  const source = JSON.parse(await readFile(sourcePath, "utf8"));
  validateSource(source);

  const finalSealIndexId = stableHashObject({
    source_id: source.scratch_preview_operator_handoff_packet_closeout_id,
    operator_handoff_packet_id: source.operator_handoff_packet.scratch_preview_operator_handoff_packet_id,
    terminal_rollup_closeout_final_seal_index_closeout_id: source.terminal_rollup_closeout_final_seal_index_closeout?.scratch_preview_terminal_rollup_closeout_final_seal_index_closeout_id,
    scratch_ledger_out_hash: source.scratch_ledger.scratch_ledger_out_hash,
    appended_line_hash: source.scratch_ledger.appended_line_hash,
    logical_candidate_next_ledger_hash: source.scratch_ledger.logical_candidate_next_ledger_hash,
    sealer,
    reason,
  });

  const finalSealIndex = {
    schema: "void.datanet.wc.evidence_packet_ledger_append_scratch_preview_operator_handoff_packet_closeout_final_seal_index.v1",
    marker: MARKER,
    status: "scratch_preview_operator_handoff_packet_closeout_final_seal_index_ready_for_operator_review",
    scratch_preview_operator_handoff_packet_closeout_final_seal_index_id: finalSealIndexId,
    created_at: process.env.VOID_LEDGER_APPEND_SCRATCH_PREVIEW_OPERATOR_HANDOFF_PACKET_CLOSEOUT_FINAL_SEAL_INDEX_CREATED_AT || new Date().toISOString(),
    sealer,
    reason,
    source_operator_handoff_packet_closeout: {
      path: sourcePath,
      marker: source.marker,
      scratch_preview_operator_handoff_packet_closeout_id: source.scratch_preview_operator_handoff_packet_closeout_id,
      closer: source.closer,
      reason: source.reason,
    },
    operator_handoff_packet: source.operator_handoff_packet,
    terminal_rollup_closeout_final_seal_index_closeout: source.terminal_rollup_closeout_final_seal_index_closeout,
    terminal_rollup_closeout_final_seal_index: source.terminal_rollup_closeout_final_seal_index,
    terminal_rollup_closeout: source.terminal_rollup_closeout,
    terminal_rollup: source.terminal_rollup,
    prior_final_seal_index_closeout: source.prior_final_seal_index_closeout,
    sealed_chain: source.sealed_chain,
    scratch_ledger: source.scratch_ledger,
    final_seal_summary: {
      operator_handoff_packet_closeout_bound: true,
      scratch_preview_operator_handoff_packet_closeout_final_seal_index_only: true,
      fully_closed_scratch_preview_chain_operator_handoff_closeout_sealed: true,
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
      scratch_preview_operator_handoff_packet_closeout_final_seal_index_only: true,
    },
    boundary: {
      scratch_preview_operator_handoff_packet_closeout_final_seal_index_only: true,
      operator_handoff_packet_closeout_only_source: true,
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
  await writeFile(outPath, `${JSON.stringify(finalSealIndex, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(finalSealIndex, null, 2));
}

main().catch((err) => {
  console.error(`datanet_wc_evidence_packet_ledger_append_scratch_preview_operator_handoff_packet_closeout_final_seal_index_error=${err.message}`);
  process.exit(1);
});
