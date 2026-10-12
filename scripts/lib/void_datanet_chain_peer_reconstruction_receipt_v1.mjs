import { TextDecoder, types } from "node:util";

import {
  VOID_DATANET_RECONSTRUCTION_HOLD_V1,
  planDatanetChainPeerReconstructionV1,
} from "./void_datanet_chain_peer_reconstruction_v1.mjs";
import {
  VOID_DATANET_CHAIN2050_COMMITMENT_RECEIPT_V1,
  verifyDatanetChain2050CommitmentReceiptV1,
} from "./void_datanet_chain2050_commitment_receipt_v1.mjs";

export const VOID_DATANET_CHAIN_PEER_RECONSTRUCTION_RECEIPT_V1 =
  "VOID_DATANET_CHAIN_PEER_RECONSTRUCTION_RECEIPT_V1";

export const VOID_DATANET_CHAIN_PEER_RECONSTRUCTION_RECEIPT_INGRESS_V1 =
  Object.freeze({
    encoding: "utf8-json-buffer",
    max_receipt_evidence_bytes: 4_194_304,
    max_nodes: 8_192,
    max_depth: 8,
    max_array_items: 256,
    max_object_keys: 32,
    max_key_chars: 64,
    max_scalar_bytes: 8_194,
  });

const MAX_RECEIPT_EVIDENCE_BYTES = 4_194_304;
const MAX_NODES = 8_192;
const MAX_DEPTH = 8;
const MAX_ARRAY_ITEMS = 256;
const MAX_OBJECT_KEYS = 32;
const MAX_KEY_CHARS = 64;
const MAX_SCALAR_BYTES = 8_194;

const typedArray = Object.getPrototypeOf(Uint8Array.prototype);
const byteLengthOf =
  Object.getOwnPropertyDescriptor(typedArray, "byteLength").get;
const backingOf =
  Object.getOwnPropertyDescriptor(typedArray, "buffer").get;
const resizableOf =
  Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "resizable").get;
const copyBytes = Uint8Array.prototype.set;
const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

function parseReceiptEvidence(input) {
  if (
    typeof input !== "object" ||
    input === null ||
    types.isProxy(input) ||
    !types.isUint8Array(input) ||
    Object.getPrototypeOf(input) !== Buffer.prototype
  ) {
    return { ok: false, reason: "receipt_ingress_requires_plain_buffer" };
  }

  const backing = backingOf.call(input);
  if (types.isSharedArrayBuffer(backing) || resizableOf.call(backing)) {
    return { ok: false, reason: "receipt_ingress_mutable_backing_store" };
  }

  const length = byteLengthOf.call(input);
  if (length === 0 || length > MAX_RECEIPT_EVIDENCE_BYTES) {
    return { ok: false, reason: "receipt_ingress_byte_bound" };
  }

  const owned = Buffer.alloc(length);
  copyBytes.call(owned, input);

  let value;
  try {
    value = JSON.parse(decoder.decode(owned));
  } catch {
    return { ok: false, reason: "receipt_ingress_invalid_utf8_json" };
  }

  const pending = [[value, 0]];
  let nodes = 0;
  while (pending.length) {
    const [item, depth] = pending.pop();
    nodes += 1;
    if (nodes > MAX_NODES || depth > MAX_DEPTH) {
      return { ok: false, reason: "receipt_ingress_structure_bound" };
    }

    if (typeof item === "string") {
      if (
        item.length > MAX_SCALAR_BYTES ||
        Buffer.byteLength(item, "utf8") > MAX_SCALAR_BYTES
      ) {
        return { ok: false, reason: "receipt_ingress_scalar_bound" };
      }
      continue;
    }

    if (typeof item === "number") {
      if (!Number.isSafeInteger(item) || Object.is(item, -0)) {
        return { ok: false, reason: "receipt_ingress_number_invalid" };
      }
      continue;
    }

    if (item === null || typeof item === "boolean") continue;

    if (Array.isArray(item)) {
      if (item.length > MAX_ARRAY_ITEMS) {
        return { ok: false, reason: "receipt_ingress_structure_bound" };
      }
      for (let i = item.length - 1; i >= 0; i -= 1) {
        pending.push([item[i], depth + 1]);
      }
      continue;
    }

    if (typeof item !== "object") {
      return { ok: false, reason: "receipt_ingress_value_invalid" };
    }

    const keys = Object.keys(item);
    if (keys.length > MAX_OBJECT_KEYS) {
      return { ok: false, reason: "receipt_ingress_structure_bound" };
    }
    for (const key of keys) {
      if (key.length === 0 || key.length > MAX_KEY_CHARS) {
        return { ok: false, reason: "receipt_ingress_key_bound" };
      }
      pending.push([item[key], depth + 1]);
    }
  }

  return { ok: true, value };
}

function receiptHold(reference, reason, receiptReason) {
  return Object.freeze({
    ...reference,
    reason,
    receipt_composition_marker:
      VOID_DATANET_CHAIN_PEER_RECONSTRUCTION_RECEIPT_V1,
    commitment_receipt_verified: false,
    commitment_evidence_scope: "RECEIPT_NOT_VERIFIED",
    receipt_verification: Object.freeze({
      status: "held",
      reason: receiptReason,
      event_receipt_membership_verified: false,
      receipt_revalidation_verified: false,
      canonical_block_hash_verified: false,
      durable_checkpoint_binding_verified: false,
      accepted_checkpoint_membership_verified: false,
      fork_choice_verified: false,
      peer_quorum_verified: false,
      chain_finality_verified: false,
      authority_ready_for_1464: false,
    }),
  });
}

function overlapMatches(commitment, observation) {
  return (
    observation?.chain_id === commitment.chain_id &&
    observation?.object_id === commitment.object_id &&
    observation?.content_sha256 === commitment.content_sha256 &&
    observation?.byte_length === commitment.byte_length &&
    observation?.commitment_transaction_hash ===
      commitment.commitment_transaction_hash &&
    observation?.commitment_log_index === commitment.commitment_log_index
  );
}

export function planDatanetChainPeerReconstructionWithReceiptV1(
  requestInput,
  receiptEvidenceInput,
) {
  const reference = planDatanetChainPeerReconstructionV1(requestInput);

  if (
    !reference ||
    reference.ok !== false ||
    reference.status !== VOID_DATANET_RECONSTRUCTION_HOLD_V1 ||
    !reference.reference_plan
  ) {
    return reference;
  }

  const parsed = parseReceiptEvidence(receiptEvidenceInput);
  if (!parsed.ok) {
    return receiptHold(
      reference,
      "chain2050_commitment_receipt_input_invalid",
      parsed.reason,
    );
  }

  const receipt = verifyDatanetChain2050CommitmentReceiptV1(parsed.value);
  if (!receipt.ok) {
    return receiptHold(
      reference,
      "chain2050_commitment_receipt_not_verified",
      receipt.reason,
    );
  }

  if (
    receipt.marker !== VOID_DATANET_CHAIN2050_COMMITMENT_RECEIPT_V1 ||
    receipt.authority_ready_for_1464 !== false ||
    receipt.chain_finality_verified !== false ||
    receipt.accepted_checkpoint_membership_verified !== false
  ) {
    return receiptHold(
      reference,
      "chain2050_commitment_receipt_authority_boundary_invalid",
      "receipt_authority_boundary_invalid",
    );
  }

  const commitment = reference.reference_plan.reference_commitment;
  if (!overlapMatches(commitment, receipt.observation_for_1464)) {
    return receiptHold(
      reference,
      "chain2050_commitment_receipt_binding_mismatch",
      "receipt_commitment_overlap_mismatch",
    );
  }

  return Object.freeze({
    ...reference,
    receipt_composition_marker:
      VOID_DATANET_CHAIN_PEER_RECONSTRUCTION_RECEIPT_V1,
    commitment_receipt_verified: true,
    commitment_evidence_scope:
      "SOURCE_BACKED_RECEIPT_CHECKPOINT_MEMBERSHIP_UNVERIFIED",
    receipt_verification: Object.freeze({
      status: receipt.status,
      marker: receipt.marker,
      chain_id: receipt.chain_id,
      registry_address: receipt.registry_address,
      transaction_hash: receipt.transaction_hash,
      log_index: receipt.log_index,
      block_height: receipt.block_height,
      block_hash: receipt.block_hash,
      receipt_fingerprint_sha256: receipt.receipt_fingerprint_sha256,
      event_receipt_membership_verified: true,
      receipt_revalidation_verified: true,
      canonical_block_hash_verified: true,
      durable_checkpoint_binding_verified: false,
      accepted_checkpoint_membership_verified: false,
      fork_choice_verified: false,
      peer_quorum_verified: false,
      chain_finality_verified: false,
      authority_ready_for_1464: false,
    }),
  });
}
