#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_SCRATCH_APPLY_HOLD_V1";
const EXECUTE_PACKET_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_EXECUTE_PACKET_HOLD_V1";
const DRY_RUN_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_APPEND_DRY_RUN_HOLD_V1";
const LEDGER_PACKET_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_LEDGER_WRITE_PACKET_HOLD_V1";
const APPROVAL_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_AWARD_APPROVAL_HOLD_V1";
const PROPOSAL_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_AWARD_PROPOSAL_HOLD_V1";
const DECISION_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_REVIEW_DECISION_HOLD_V1";
const QUEUE_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_REVIEW_QUEUE_HOLD_V1";
const ROUNDTRIP_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_ROUNDTRIP_HOLD_V1";
const GENERATOR_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_GENERATOR_HOLD_V1";
const VERIFIER_MARKER = "VOID_DATANET_WC_EVIDENCE_PACKET_VERIFIER_HOLD_V1";

const CONFIRM_PHRASE = "I_UNDERSTAND_THIS_WRITES_ONLY_A_SCRATCH_LEDGER_PREVIEW";
const ZERO_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

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

function validateExecutePacket(record) {
  if (record.schema !== "void.datanet.wc.evidence_packet_ledger_append_execute_packet.v1") throw new Error("execute_packet_schema_mismatch");
  if (record.marker !== EXECUTE_PACKET_MARKER) throw new Error("execute_packet_marker_mismatch");
  if (record.status !== "ledger_append_execute_packet_recorded") throw new Error("execute_packet_status_mismatch");
  assertHex64(record.execute_packet_id, "execute_packet_id");
  if (record.execution_mode !== "manual_operator_append_review") throw new Error("execution_mode_mismatch");

  const intent = record.append_execution_intent || {};
  if (intent.operation !== "append_only_manual_operator_candidate") throw new Error("append_execution_intent_operation_mismatch");
  assertHex64(intent.previous_ledger_hash, "previous_ledger_hash");
  assertHex64(intent.candidate_line_hash, "candidate_line_hash");
  assertHex64(intent.candidate_next_ledger_hash, "candidate_next_ledger_hash");

  const line = intent.candidate_line || {};
  if (line.schema !== "void.datanet.wc.ledger_line_candidate.v1") throw new Error("candidate_line_schema_mismatch");
  if (line.operation !== "append_only_dry_run_candidate") throw new Error("candidate_line_operation_mismatch");
  assertHex64(line.previous_ledger_hash, "line_previous_ledger_hash");
  assertHex64(line.evidence_hash, "line_evidence_hash");
  assertHex64(line.approval_id, "line_approval_id");
  assertHex64(line.proposal_id, "line_proposal_id");
  assertHex64(line.review_id, "line_review_id");
  assertHex64(line.packet_id, "line_packet_id");
  assertHex64(line.candidate_line_hash, "line_candidate_line_hash");
  if (!/^[1-9][0-9]*$/.test(line.approved_wc_amount || "")) throw new Error("approved_wc_amount_invalid");

  const lineCore = { ...line };
  delete lineCore.candidate_line_hash;
  const recomputedLineHash = stableHashObject(lineCore);
  if (recomputedLineHash !== line.candidate_line_hash) throw new Error("candidate_line_hash_mismatch");
  if (intent.candidate_line_hash !== line.candidate_line_hash) throw new Error("intent_candidate_line_hash_mismatch");
  if (intent.previous_ledger_hash !== line.previous_ledger_hash) throw new Error("intent_previous_ledger_hash_mismatch");

  const recomputedNext = stableHashObject({
    previous_ledger_hash: intent.previous_ledger_hash,
    candidate_line_hash: intent.candidate_line_hash
  });
  if (recomputedNext !== intent.candidate_next_ledger_hash) throw new Error("candidate_next_ledger_hash_mismatch");

  const source = record.source || {};
  if (source.dry_run_marker !== DRY_RUN_MARKER) throw new Error("dry_run_marker_mismatch");
  if (source.packet_marker !== LEDGER_PACKET_MARKER) throw new Error("packet_marker_mismatch");
  if (source.approval_marker !== APPROVAL_MARKER) throw new Error("approval_marker_mismatch");
  if (source.approval_decision !== "approve_award") throw new Error("approval_decision_mismatch");
  if (source.proposal_marker !== PROPOSAL_MARKER) throw new Error("proposal_marker_mismatch");
  if (source.decision_marker !== DECISION_MARKER) throw new Error("decision_marker_mismatch");
  if (source.decision !== "accept_evidence") throw new Error("source_decision_not_accept_evidence");
  if (source.queue_marker !== QUEUE_MARKER) throw new Error("queue_marker_mismatch");
  if (source.summary_marker !== ROUNDTRIP_MARKER) throw new Error("summary_marker_mismatch");
  if (source.generator_marker !== GENERATOR_MARKER) throw new Error("generator_marker_mismatch");
  if (source.verifier_marker !== VERIFIER_MARKER) throw new Error("verifier_marker_mismatch");

  assertBool(record.work_credits_policy?.useful_verifiable_work_only, true, "useful_verifiable_work_only");
  assertBool(record.work_credits_policy?.unlimited_uncapped_accounting_units, true, "unlimited_uncapped_accounting_units");
  assertBool(record.work_credits_policy?.finite_approved_amount_for_this_review, true, "finite_approved_amount_for_this_review");
  assertBool(record.work_credits_policy?.separate_operator_append_execution_required, true, "separate_operator_append_execution_required");

  const boundary = record.boundary || {};
  assertBool(boundary.execute_packet_only, true, "execute_packet_only");
  assertBool(boundary.ledger_append_performed, false, "ledger_append_performed");
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

function ledgerHashFromBytes(bytes) {
  if (bytes.length === 0) return ZERO_HASH;
  return sha256(bytes);
}

async function readLedgerBytes(file) {
  try {
    return await readFile(file);
  } catch (err) {
    if (err && err.code === "ENOENT") return Buffer.from("");
    throw err;
  }
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(`Usage: node tools/datanet-wc-evidence-packet-ledger-append-scratch-apply.mjs --execute-packet <execute-packet.json> --ledger-in <scratch-ledger.jsonl> --ledger-out <scratch-ledger-out.jsonl> --operator <handle> --confirm ${CONFIRM_PHRASE} --reason <text>`);
    return;
  }

  const executePacketPath = path.resolve(requireArg("execute-packet"));
  const ledgerInPath = path.resolve(requireArg("ledger-in"));
  const ledgerOutPath = path.resolve(requireArg("ledger-out"));
  const operator = requireArg("operator");
  const confirm = requireArg("confirm");
  const reason = requireArg("reason");

  if (confirm !== CONFIRM_PHRASE) throw new Error("confirm_phrase_mismatch");
  if (ledgerInPath === ledgerOutPath) throw new Error("ledger_out_must_differ_from_ledger_in");

  const executePacket = JSON.parse(await readFile(executePacketPath, "utf8"));
  validateExecutePacket(executePacket);

  const ledgerInBytes = await readLedgerBytes(ledgerInPath);
  const currentScratchLedgerHash = ledgerHashFromBytes(ledgerInBytes);

  const intent = executePacket.append_execution_intent;
  const line = intent.candidate_line;
  if (currentScratchLedgerHash !== intent.previous_ledger_hash) {
    throw new Error("scratch_ledger_current_hash_mismatch");
  }

  const appendLine = JSON.stringify(line);
  const separator = ledgerInBytes.length > 0 && !ledgerInBytes.toString("utf8").endsWith("\n") ? "\n" : "";
  const ledgerOutText = ledgerInBytes.toString("utf8") + separator + appendLine + "\n";
  const scratchLedgerOutHash = sha256(Buffer.from(ledgerOutText, "utf8"));

  const scratchApplyId = stableHashObject({
    execute_packet_id: executePacket.execute_packet_id,
    candidate_line_hash: line.candidate_line_hash,
    candidate_next_ledger_hash: intent.candidate_next_ledger_hash,
    scratch_ledger_out_hash: scratchLedgerOutHash,
    operator,
    reason
  });

  await mkdir(path.dirname(ledgerOutPath), { recursive: true });
  await writeFile(ledgerOutPath, ledgerOutText, "utf8");

  const result = {
    schema: "void.datanet.wc.evidence_packet_ledger_append_scratch_apply.v1",
    marker: MARKER,
    status: "scratch_ledger_preview_written",
    scratch_apply_id: scratchApplyId,
    created_at: process.env.VOID_LEDGER_APPEND_SCRATCH_APPLY_CREATED_AT || new Date().toISOString(),
    operator,
    reason,
    ledger_in_path: ledgerInPath,
    ledger_out_path: ledgerOutPath,
    current_scratch_ledger_hash: currentScratchLedgerHash,
    scratch_ledger_out_hash: scratchLedgerOutHash,
    logical_candidate_next_ledger_hash: intent.candidate_next_ledger_hash,
    appended_line_hash: line.candidate_line_hash,
    appended_line: line,
    source: {
      execute_packet_path: executePacketPath,
      execute_packet_marker: executePacket.marker,
      execute_packet_id: executePacket.execute_packet_id,
      dry_run_marker: executePacket.source.dry_run_marker,
      dry_run_id: executePacket.source.dry_run_id,
      packet_marker: executePacket.source.packet_marker,
      packet_id: executePacket.source.packet_id,
      approval_marker: executePacket.source.approval_marker,
      approval_id: executePacket.source.approval_id,
      proposal_marker: executePacket.source.proposal_marker,
      proposal_id: executePacket.source.proposal_id,
      decision_marker: executePacket.source.decision_marker,
      decision_id: executePacket.source.decision_id,
      queue_marker: executePacket.source.queue_marker,
      review_id: executePacket.source.review_id,
      summary_marker: executePacket.source.summary_marker,
      generator_marker: executePacket.source.generator_marker,
      verifier_marker: executePacket.source.verifier_marker,
      evidence_hash: executePacket.source.evidence_hash,
      work_id: executePacket.source.work_id,
      worker: executePacket.source.worker,
      files: executePacket.source.files
    },
    work_credits_policy: {
      useful_verifiable_work_only: true,
      unlimited_uncapped_accounting_units: true,
      finite_approved_amount_for_this_review: true,
      scratch_preview_only: true
    },
    boundary: {
      scratch_apply_only: true,
      canonical_ledger_append_performed: false,
      wc_issuance_enabled: false,
      wc_claim_enabled: false,
      wc_ledger_write_enabled: false,
      void_transfer_enabled: false,
      usdc_transfer_enabled: false,
      wallet_connection_enabled: false,
      signer_access_enabled: false,
      network_submit_enabled: false,
      public_mutation_enabled: false
    }
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(`datanet_wc_evidence_packet_ledger_append_scratch_apply_error=${err.message}`);
  process.exit(1);
});
