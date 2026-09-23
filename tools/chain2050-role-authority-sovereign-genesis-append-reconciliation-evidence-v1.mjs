#!/usr/bin/env node
import crypto from "node:crypto";

export const MARKER =
  "VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_GENESIS_APPEND_RECONCILIATION_EVIDENCE_V1";

const EXPECTED = Object.freeze({
  evidence_id: "voidcrasgarce1_31f02a7a3da637eab8813ca1224b165575d4608265bed9be0efda0e2a552c162",
  authorization_id: "voidcrasgaa1_fb46e3048b5921da3856de4548823b61f32e64f423bf5e7fd4758b9e04e27355",
  append_request_id: "voidcrasgar1_e97b68fcbb085aec3b0e502d4e00b5e662d3a13374a87cbe51e0a8a687e27481",
  tx_hash: "0xd6f2eea882fc9351644072e23c8a5279fbdc085a0ee153d6b9fa73aef247e6e7",
  block_number: "37392",
  block_hash: "0x739679fd9f9b6f96213c440350980a1b590324c9152b7c394c81ce3627c94f52",
  gas_used: "371459",
  owner_balance: "128540997399787",
  role_record: "1492c4d55f5c6d4873a28ca08d641196ba51d9e5c0a7c1cc31f27bf1a6405b0b",
  empty_root: "d50b8a122e11454b6cca6a03b312ecac6af6ea1a5d5c5d5f9dd3fdd03b1faea7",
  root: "54619d93d1f94746cb92c3bb4de038d014d5c90b73789581486b4a12b4322041"
});

function canonical(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  return "{" + Object.keys(v).sort().map(k => JSON.stringify(k)+":"+canonical(v[k])).join(",") + "}";
}
function sha256(v) {
  return crypto.createHash("sha256").update(v, "utf8").digest("hex");
}
function fail(reason) { throw new Error(reason); }

export function verifySovereignGenesisAppendReconciliationEvidenceV1(v) {
  if (
    !v ||
    v.marker !== MARKER ||
    v.version !== 1 ||
    v.status !== "green_exact_single_sovereign_genesis_registry_append_reconciled" ||
    v.reconciliation_evidence_id !== EXPECTED.evidence_id ||
    v.authorization_id !== EXPECTED.authorization_id ||
    v.append_request_id !== EXPECTED.append_request_id ||
    v.signed_transaction_hash !== EXPECTED.tx_hash ||
    v.receipt?.status !== 1 ||
    v.receipt?.block_number !== EXPECTED.block_number ||
    v.receipt?.block_hash !== EXPECTED.block_hash ||
    v.receipt?.gas_used !== EXPECTED.gas_used ||
    v.receipt?.effective_gas_cost_wei !== "371459002600213" ||
    v.receipt?.block_transaction_occurrence_count !== 1 ||
    v.post_state?.owner_nonce_at_receipt_block !== "1" ||
    v.post_state?.owner_nonce_latest !== "1" ||
    v.post_state?.owner_nonce_pending !== "1" ||
    v.post_state?.owner_balance_at_receipt_block_wei !== EXPECTED.owner_balance ||
    v.post_state?.owner_balance_latest_wei !== EXPECTED.owner_balance ||
    v.post_state?.registry_entry_count !== "1" ||
    v.post_state?.registry_root_sha256 !== EXPECTED.root ||
    v.post_state?.entry0_exact !== true ||
    v.entry0?.identity_id !== "sovereign.zoso" ||
    v.entry0?.role !== "SOVEREIGN" ||
    v.entry0?.role_authority_generation !== "0" ||
    v.entry0?.role_record_sha256 !== EXPECTED.role_record ||
    v.entry0?.previous_registry_root_sha256 !== EXPECTED.empty_root ||
    v.entry0?.registry_root_sha256 !== EXPECTED.root ||
    v.execution?.rpc_send_invocation_count !== 1 ||
    v.execution?.automatic_retry_performed !== false ||
    v.execution?.replacement_transaction_created !== false ||
    v.execution?.value_transfer_performed !== false ||
    v.execution?.chain2050_write_performed !== true ||
    v.execution?.registry_append_performed !== true ||
    v.execution?.prior_post_send_nonce_read_was_stale_or_cached !== true ||
    v.authority?.authorization_consumed !== true ||
    v.authority?.further_submission_authorized !== false ||
    v.authority?.automatic_retry_authorized !== false ||
    v.authority?.replacement_transaction_authorized !== false ||
    v.authority?.additional_registry_append_authorized !== false ||
    v.next_gate !== "canonical_role_authority_query_and_identity_session_integration_read_only"
  ) fail("sovereign_genesis_append_reconciliation_evidence_binding_invalid");

  const material = {
    authorization_id: v.authorization_id,
    append_request_id: v.append_request_id,
    signed_transaction_hash: v.signed_transaction_hash,
    receipt_block_number: v.receipt.block_number,
    receipt_block_hash: v.receipt.block_hash,
    receipt_status: v.receipt.status,
    receipt_gas_used: v.receipt.gas_used,
    block_transaction_occurrence_count: v.receipt.block_transaction_occurrence_count,
    owner_nonce_at_receipt_block: v.post_state.owner_nonce_at_receipt_block,
    owner_nonce_latest: v.post_state.owner_nonce_latest,
    owner_nonce_pending: v.post_state.owner_nonce_pending,
    owner_balance_latest_wei: v.post_state.owner_balance_latest_wei,
    registry_entry_count: v.post_state.registry_entry_count,
    registry_root: v.post_state.registry_root_sha256,
    entry0_exact: v.post_state.entry0_exact,
    send_invocation_count: v.execution.rpc_send_invocation_count,
    automatic_retry_performed: v.execution.automatic_retry_performed,
    replacement_transaction_created: v.execution.replacement_transaction_created
  };
  const id = "voidcrasgarce1_" + sha256(canonical(material));
  if (id !== EXPECTED.evidence_id) fail("sovereign_genesis_append_reconciliation_evidence_id_mismatch");

  return Object.freeze({
    ok: true,
    reconciliation_evidence_id: id,
    signed_transaction_hash: v.signed_transaction_hash,
    registry_entry_count: v.post_state.registry_entry_count,
    registry_root_sha256: v.post_state.registry_root_sha256,
    owner_nonce_latest: v.post_state.owner_nonce_latest,
    authorization_consumed: v.authority.authorization_consumed
  });
}
