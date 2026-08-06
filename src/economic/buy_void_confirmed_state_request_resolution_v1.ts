import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_V1,
  buyVoidConfirmedStateJournalPathsV1,
  type BuyVoidConfirmedStateCompletionV1,
  type BuyVoidConfirmedStateIndexV1,
  type BuyVoidConfirmedStateV1,
} from "./buy_void_confirmed_state_journal_v1.js";

export const VOID_BUY_VOID_CONFIRMED_STATE_REQUEST_RESOLUTION_V1 =
  "VOID_BUY_VOID_CONFIRMED_STATE_REQUEST_RESOLUTION_V1";

const SHA256 = /^[0-9a-f]{64}$/;
const TX_HASH = /^0x[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const MAX_JSON_BYTES = 1024 * 1024;

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function stableFingerprint(parts: Record<string, string>): string {
  return sha256Hex(
    Object.keys(parts)
      .sort()
      .map((key) => `${key}=${parts[key]}`)
      .join("\n"),
  );
}

function requestKey(requestId: string): string {
  return sha256Hex(`void-buy-confirmed-request-v1\n${requestId}`);
}

function paymentKey(identity: string): string {
  return sha256Hex(`void-buy-confirmed-payment-v1\n${identity}`);
}

function deliveryKey(txHash: string): string {
  return sha256Hex(`void-buy-confirmed-delivery-v1\n${txHash}`);
}

function normalizeHash(value: unknown, label: string): string {
  const normalized = String(value || "").trim().toLowerCase();
  if (!TX_HASH.test(normalized)) {
    throw new Error(`${label}_invalid`);
  }
  return normalized;
}

function normalizeAddress(value: unknown, label: string): string {
  const normalized = String(value || "").trim().toLowerCase();
  if (!ADDRESS.test(normalized)) {
    throw new Error(`${label}_invalid`);
  }
  return normalized;
}

function decimal(value: unknown, label: string): string {
  const normalized = String(value ?? "").trim();
  if (!/^(0|[1-9][0-9]*)$/.test(normalized)) {
    throw new Error(`${label}_invalid`);
  }
  return normalized;
}

function readDirectJsonObject(
  file: string,
  label: string,
): Record<string, any> | null {
  let stat: fs.Stats;
  try {
    stat = fs.lstatSync(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return null;
    throw error;
  }
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(`${label}_must_be_direct_regular_file`);
  }
  if (stat.size <= 0 || stat.size > MAX_JSON_BYTES) {
    throw new Error(`${label}_size_invalid`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(
      `${label}_json_invalid:${String((error as Error)?.message || error)}`,
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label}_shape_invalid`);
  }
  return parsed as Record<string, any>;
}

function parseCompletion(
  value: Record<string, any>,
): BuyVoidConfirmedStateCompletionV1 {
  if (
    value.schema !== "void_buy_void_confirmed_state_completion_v1" ||
    value.marker !== VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_V1 ||
    value.final !== true ||
    !SHA256.test(String(value.state_id || "")) ||
    !SHA256.test(String(value.payment_key_sha256 || "")) ||
    !SHA256.test(String(value.request_key_sha256 || "")) ||
    !SHA256.test(String(value.delivery_key_sha256 || "")) ||
    !SHA256.test(String(value.projection_fingerprint || ""))
  ) {
    throw new Error("confirmed_state_completion_invalid");
  }
  return value as BuyVoidConfirmedStateCompletionV1;
}

function parseState(value: Record<string, any>): BuyVoidConfirmedStateV1 {
  if (
    value.schema !== "void_buy_void_confirmed_state_v1" ||
    value.marker !== VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_V1 ||
    !SHA256.test(String(value.state_id || "")) ||
    !SHA256.test(String(value.payment_key_sha256 || "")) ||
    !SHA256.test(String(value.request_key_sha256 || "")) ||
    !SHA256.test(String(value.delivery_key_sha256 || "")) ||
    !SHA256.test(String(value.projection_fingerprint || "")) ||
    !value.confirmation ||
    !value.buyer_status ||
    !value.allocation_status ||
    !value.fulfillment_receipt
  ) {
    throw new Error("confirmed_state_candidate_invalid");
  }
  return value as BuyVoidConfirmedStateV1;
}

function parseRequestIndex(
  value: Record<string, any>,
): BuyVoidConfirmedStateIndexV1 {
  if (
    value.schema !== "void_buy_void_confirmed_state_index_v1" ||
    value.marker !== VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_V1 ||
    value.index_kind !== "request" ||
    !SHA256.test(String(value.key_sha256 || "")) ||
    !SHA256.test(String(value.state_id || ""))
  ) {
    throw new Error("confirmed_state_request_index_invalid");
  }
  return value as BuyVoidConfirmedStateIndexV1;
}

function validateCompletionCandidateBinding(
  completion: BuyVoidConfirmedStateCompletionV1,
  state: BuyVoidConfirmedStateV1,
): void {
  const canonicalPaymentIdentity = String(
    state.canonical_payment_identity || "",
  ).trim();
  const requestId = String(state.request_id || "").trim();
  const instructionId = String(state.instruction_id || "").trim();
  if (!canonicalPaymentIdentity || !requestId || !instructionId) {
    throw new Error("confirmed_state_identity_binding_invalid");
  }

  const deliveryTx = normalizeHash(
    state.confirmation?.void_delivery_tx_hash,
    "confirmed_state_delivery_tx",
  );
  const deliveryAddress = normalizeAddress(
    state.fulfillment_receipt?.delivery_address,
    "confirmed_state_delivery_address",
  );
  const voidAmountUnits = decimal(
    state.fulfillment_receipt?.void_amount_units,
    "confirmed_state_void_amount_units",
  );
  const deliveryBlockNumber = decimal(
    state.fulfillment_receipt?.delivery_block_number,
    "confirmed_state_delivery_block_number",
  );
  const deliveryChainId = decimal(
    state.fulfillment_receipt?.delivery_chain_id,
    "confirmed_state_delivery_chain_id",
  );

  const expectedPaymentKey = paymentKey(canonicalPaymentIdentity);
  const expectedRequestKey = requestKey(requestId);
  const expectedDeliveryKey = deliveryKey(deliveryTx);
  const expectedStateId = stableFingerprint({
    canonical_payment_identity: canonicalPaymentIdentity,
    request_id: requestId,
    instruction_id: instructionId,
    void_delivery_tx_hash: deliveryTx,
  });
  const expectedProjectionFingerprint = stableFingerprint({
    state_id: expectedStateId,
    canonical_payment_identity: canonicalPaymentIdentity,
    request_id: requestId,
    instruction_id: instructionId,
    void_delivery_tx_hash: deliveryTx,
    delivery_address: deliveryAddress,
    void_amount_units: voidAmountUnits,
    delivery_block_number: deliveryBlockNumber,
    delivery_chain_id: deliveryChainId,
  });

  const exactBindings: Array<[unknown, unknown, string]> = [
    [state.payment_key_sha256, expectedPaymentKey, "state_payment_key_mismatch"],
    [state.request_key_sha256, expectedRequestKey, "state_request_key_mismatch"],
    [state.delivery_key_sha256, expectedDeliveryKey, "state_delivery_key_mismatch"],
    [state.state_id, expectedStateId, "state_id_recomputation_mismatch"],
    [
      state.projection_fingerprint,
      expectedProjectionFingerprint,
      "state_projection_fingerprint_recomputation_mismatch",
    ],
    [completion.state_id, state.state_id, "completion_state_id_mismatch"],
    [
      completion.payment_key_sha256,
      state.payment_key_sha256,
      "completion_payment_key_mismatch",
    ],
    [
      completion.request_key_sha256,
      state.request_key_sha256,
      "completion_request_key_mismatch",
    ],
    [
      completion.delivery_key_sha256,
      state.delivery_key_sha256,
      "completion_delivery_key_mismatch",
    ],
    [
      completion.projection_fingerprint,
      state.projection_fingerprint,
      "completion_projection_fingerprint_mismatch",
    ],
  ];
  for (const [actual, expected, reason] of exactBindings) {
    if (actual !== expected) throw new Error(reason);
  }
}

function validateRequestIndexBinding(
  index: BuyVoidConfirmedStateIndexV1,
  state: BuyVoidConfirmedStateV1,
): void {
  const exactBindings: Array<[unknown, unknown, string]> = [
    [index.key_sha256, state.request_key_sha256, "request_index_key_mismatch"],
    [index.state_id, state.state_id, "request_index_state_id_mismatch"],
    [
      index.canonical_payment_identity,
      state.canonical_payment_identity,
      "request_index_payment_identity_mismatch",
    ],
    [index.request_id, state.request_id, "request_index_request_id_mismatch"],
    [
      index.instruction_id,
      state.instruction_id,
      "request_index_instruction_id_mismatch",
    ],
    [
      String(index.void_delivery_tx_hash || "").trim().toLowerCase(),
      String(state.confirmation?.void_delivery_tx_hash || "")
        .trim()
        .toLowerCase(),
      "request_index_delivery_tx_mismatch",
    ],
  ];
  for (const [actual, expected, reason] of exactBindings) {
    if (actual !== expected) throw new Error(reason);
  }
}

export function resolveBuyVoidConfirmedStatesByRequestV1(
  rootDir: string,
  requestIdInput: string,
): BuyVoidConfirmedStateV1[] {
  const requestId = String(requestIdInput || "").trim();
  if (!requestId || requestId.includes("\0")) {
    throw new Error("confirmed_state_request_id_invalid");
  }

  const paths = buyVoidConfirmedStateJournalPathsV1(rootDir);
  let completeStat: fs.Stats;
  try {
    completeStat = fs.lstatSync(paths.complete_dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error;
    const orphanIndex = readDirectJsonObject(
      path.join(paths.requests_dir, `${requestKey(requestId)}.json`),
      "confirmed_state_request_index",
    );
    if (orphanIndex) {
      throw new Error("request_index_without_completion_directory");
    }
    return [];
  }
  if (completeStat.isSymbolicLink() || !completeStat.isDirectory()) {
    throw new Error("confirmed_state_complete_dir_invalid");
  }

  const matches: BuyVoidConfirmedStateV1[] = [];
  for (const name of fs.readdirSync(paths.complete_dir).sort()) {
    if (!/^[0-9a-f]{64}\.json$/.test(name)) continue;
    const fileStateId = name.slice(0, -5);
    const completionRaw = readDirectJsonObject(
      path.join(paths.complete_dir, name),
      "confirmed_state_completion",
    );
    if (!completionRaw) {
      throw new Error("confirmed_state_completion_disappeared");
    }
    const completion = parseCompletion(completionRaw);
    if (completion.state_id !== fileStateId) {
      throw new Error("completion_filename_state_id_mismatch");
    }

    const stateRaw = readDirectJsonObject(
      path.join(paths.candidates_dir, `${completion.state_id}.json`),
      "confirmed_state_candidate",
    );
    if (!stateRaw) {
      throw new Error(`confirmed_state_missing_candidate:${completion.state_id}`);
    }
    const state = parseState(stateRaw);
    validateCompletionCandidateBinding(completion, state);
    if (String(state.request_id || "").trim() === requestId) {
      matches.push(state);
    }
  }

  if (matches.length !== 1) return matches;

  const state = matches[0];
  const requestIndexRaw = readDirectJsonObject(
    path.join(paths.requests_dir, `${requestKey(requestId)}.json`),
    "confirmed_state_request_index",
  );
  if (!requestIndexRaw) {
    throw new Error("confirmed_state_request_index_missing");
  }
  validateRequestIndexBinding(parseRequestIndex(requestIndexRaw), state);
  return matches;
}
