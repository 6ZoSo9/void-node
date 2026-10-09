import crypto from "node:crypto";
import { TextDecoder } from "node:util";

import {
  VOID_BUY_COUPLED_LAUNCH_ID_V1,
  VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1,
  VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_V1,
  VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1,
  buildBuyLaunchGenerationEventV1,
  buyLaunchLiveActivationReceiptIdV1,
  readBuyLaunchSourceGateV1,
  classifyBuyLaunchGenerationJournalV1,
  verifyBuyLaunchLiveActivationSignatureV1,
  verifyBuyLaunchLiveActivationSovereignSignatureV1,
} from "./buy_void_coupled_launch_gate_v1.mjs";

export const VOID_BUY_VOID_CUSTODY_LAUNCH_AUTHORITY_V2 =
  "VOID_BUY_VOID_CUSTODY_LAUNCH_AUTHORITY_V2";

export const VOID_BUY_VOID_CUSTODY_LAUNCH_HIGH_WATER_V2 =
  "VOID_BUY_VOID_CUSTODY_LAUNCH_HIGH_WATER_V2";

export const VOID_BUY_VOID_CUSTODY_LAUNCH_AUTHORITY_V2_POLICY =
  Object.freeze({
    source_only_classifier: true,
    cross_uid_operator_home_anchor_dependency: false,
    dual_signature_required: true,
    shared_generation_journal_required: true,
    custody_private_high_water_required: true,
    custody_high_water_writer_implemented: false,
    caller_supplied_source_gate_authority: false,
    caller_supplied_verified_boolean_authority: false,
    caller_supplied_anchor_path_authority: false,
    custody_reserve_method_enabled: false,
    custody_recover_method_enabled: false,
    runtime_integration: false,
    production_allocation_mutation_ready: false,
    payment_acceptance: false,
    wallet_or_signer_access: false,
    transaction_broadcast: false,
    chain2050_write: false,
    wc_mutation: false,
    presale_or_market_activation: false,
    funds_movement: false,
  });

const BYTES32 = /^0x[0-9a-fA-F]{64}$/u;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const RECEIPT_ID = /^voidbclive1_[0-9a-f]{64}$/u;
const MAX_JOURNAL_BYTES = 64 * 1024;
const MAX_RECEIPT_BYTES = 64 * 1024;
const MAX_HIGH_WATER_BYTES = 16 * 1024;
const MAX_LEASE_MS = 5 * 60 * 1000;
const UTF8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

const RECEIPT_KEYS = Object.freeze([
  "activated_at_ms",
  "activation_generation",
  "activation_nonce",
  "activation_receipt_id",
  "activation_signature",
  "activation_signer",
  "buy_void_private_runtime_active",
  "coupled_launch_id",
  "expires_at_ms",
  "generation_tip_sha256",
  "marker",
  "public_buy_request_intake_authorized",
  "public_presale_active",
  "runtime_or_launch_evidence",
  "same_launch_ceremony",
  "sovereign_signature",
  "sovereign_signer",
  "source_composition_id",
  "source_ready_only",
  "status",
  "version",
  "wc_void_market_active",
]);

const HIGH_WATER_KEYS = Object.freeze([
  "generation",
  "marker",
  "sequence",
  "source_composition_id",
  "state",
  "tip_sha256",
  "version",
]);

function fail(reason) {
  throw new Error("custody_launch_authority_" + reason);
}

function sha256Id(bytes) {
  return "sha256:" +
    crypto.createHash("sha256").update(bytes).digest("hex");
}

function boundedBytes(value, maximum, reason) {
  if (!Buffer.isBuffer(value) || value.length < 1 || value.length > maximum) {
    fail(reason);
  }
  return value;
}

function exactKeys(value, keys, reason) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(reason);
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(reason);
  }
  return value;
}

function parseJsonBytes(bytes, maximum, reason) {
  boundedBytes(bytes, maximum, reason + "_size_invalid");
  let text;
  try {
    text = UTF8.decode(bytes);
  } catch {
    fail(reason + "_utf8_invalid");
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    fail(reason + "_json_invalid");
  }
  return { text, parsed };
}

function normalizedSourceGate(sourceGate) {
  if (
    !sourceGate ||
    typeof sourceGate !== "object" ||
    Array.isArray(sourceGate) ||
    sourceGate.ready !== true ||
    sourceGate.id !== VOID_BUY_COUPLED_LAUNCH_ID_V1 ||
    !SHA256_ID.test(String(sourceGate.composition_id || ""))
  ) {
    fail("source_gate_not_ready");
  }
  return Object.freeze({
    id: sourceGate.id,
    composition_id: sourceGate.composition_id,
  });
}

function parseReceipt(receiptBytes, sourceGate, nowMs) {
  const { parsed } = parseJsonBytes(
    receiptBytes,
    MAX_RECEIPT_BYTES,
    "receipt",
  );
  const receipt = exactKeys(parsed, RECEIPT_KEYS, "receipt_shape_invalid");
  if (
    receipt.marker !== VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_V1 ||
    receipt.version !== 1 ||
    receipt.status !== "COUPLED_PUBLIC_LAUNCH_ACTIVE" ||
    receipt.coupled_launch_id !== VOID_BUY_COUPLED_LAUNCH_ID_V1 ||
    receipt.source_composition_id !== sourceGate.composition_id ||
    !RECEIPT_ID.test(String(receipt.activation_receipt_id || "")) ||
    !BYTES32.test(String(receipt.activation_nonce || "")) ||
    !BYTES32.test(String(receipt.activation_generation || "")) ||
    !SHA256_ID.test(String(receipt.generation_tip_sha256 || "")) ||
    String(receipt.activation_signer || "").toLowerCase() !==
      VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1 ||
    String(receipt.sovereign_signer || "").toLowerCase() !==
      VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1 ||
    receipt.buy_void_private_runtime_active !== true ||
    receipt.wc_void_market_active !== true ||
    receipt.public_presale_active !== true ||
    receipt.same_launch_ceremony !== true ||
    receipt.public_buy_request_intake_authorized !== true ||
    receipt.runtime_or_launch_evidence !== true ||
    receipt.source_ready_only !== false ||
    !Number.isSafeInteger(receipt.activated_at_ms) ||
    receipt.activated_at_ms <= 0 ||
    !Number.isSafeInteger(receipt.expires_at_ms) ||
    receipt.expires_at_ms <= receipt.activated_at_ms ||
    receipt.expires_at_ms - receipt.activated_at_ms > MAX_LEASE_MS ||
    !Number.isSafeInteger(nowMs) ||
    nowMs < receipt.activated_at_ms ||
    nowMs >= receipt.expires_at_ms
  ) {
    fail("receipt_semantics_invalid");
  }

  const body = { ...receipt };
  delete body.activation_receipt_id;
  delete body.activation_signature;
  delete body.sovereign_signature;
  if (
    buyLaunchLiveActivationReceiptIdV1(body) !==
    receipt.activation_receipt_id
  ) {
    fail("receipt_id_invalid");
  }

  return Object.freeze({
    receipt: Object.freeze({ ...receipt }),
    receipt_sha256: sha256Id(receiptBytes),
  });
}

function verifyReceiptSignatures(
  receipt,
  expectedActivationSigner,
  expectedSovereignSigner,
) {
  const activated = verifyBuyLaunchLiveActivationSignatureV1(
    receipt,
    expectedActivationSigner,
  );
  const sovereign = verifyBuyLaunchLiveActivationSovereignSignatureV1(
    receipt,
    expectedSovereignSigner,
  );
  if (activated.verified !== true || sovereign.verified !== true) {
    fail("receipt_signature_invalid");
  }
  return Object.freeze({
    activation_signer: activated.recovered_signer,
    sovereign_signer: sovereign.recovered_signer,
  });
}

function journalLines(journalBytes) {
  boundedBytes(
    journalBytes,
    MAX_JOURNAL_BYTES,
    "generation_journal_size_invalid",
  );
  let text;
  try {
    text = UTF8.decode(journalBytes);
  } catch {
    fail("generation_journal_utf8_invalid");
  }
  const lines = text.endsWith("\n")
    ? text.slice(0, -1).split("\n")
    : text.split("\n");
  if (lines.length < 1 || lines.some((line) => line.length < 1)) {
    fail("generation_journal_lines_invalid");
  }
  return lines;
}

function activeJournalState(journalBytes) {
  let state;
  try {
    state = classifyBuyLaunchGenerationJournalV1(journalBytes);
  } catch {
    fail("generation_journal_invalid");
  }
  if (
    state.ready !== true ||
    !BYTES32.test(String(state.generation || "")) ||
    !SHA256_ID.test(String(state.tip_sha256 || "")) ||
    !Number.isSafeInteger(state.sequence) ||
    state.sequence < 1
  ) {
    fail("generation_journal_not_active");
  }
  return Object.freeze({
    ready: true,
    generation: state.generation,
    tip_sha256: state.tip_sha256,
    sequence: state.sequence,
  });
}

export function buildBuyVoidCustodyLaunchHighWaterV2({
  source_composition_id,
  sequence,
  generation,
  tip_sha256,
}) {
  if (
    !SHA256_ID.test(String(source_composition_id || "")) ||
    !Number.isSafeInteger(sequence) ||
    sequence < 1 ||
    !BYTES32.test(String(generation || "")) ||
    !SHA256_ID.test(String(tip_sha256 || ""))
  ) {
    fail("high_water_input_invalid");
  }
  const body = Object.freeze({
    marker: VOID_BUY_VOID_CUSTODY_LAUNCH_HIGH_WATER_V2,
    version: 2,
    source_composition_id,
    sequence,
    generation,
    state: "active",
    tip_sha256,
  });
  return Buffer.from(JSON.stringify(body, null, 2) + "\n", "utf8");
}

function parseHighWater(highWaterBytes) {
  const { text, parsed } = parseJsonBytes(
    highWaterBytes,
    MAX_HIGH_WATER_BYTES,
    "high_water",
  );
  const highWater = exactKeys(
    parsed,
    HIGH_WATER_KEYS,
    "high_water_shape_invalid",
  );
  if (
    highWater.marker !== VOID_BUY_VOID_CUSTODY_LAUNCH_HIGH_WATER_V2 ||
    highWater.version !== 2 ||
    !SHA256_ID.test(String(highWater.source_composition_id || "")) ||
    !Number.isSafeInteger(highWater.sequence) ||
    highWater.sequence < 1 ||
    !BYTES32.test(String(highWater.generation || "")) ||
    highWater.state !== "active" ||
    !SHA256_ID.test(String(highWater.tip_sha256 || ""))
  ) {
    fail("high_water_semantics_invalid");
  }
  const canonical = buildBuyVoidCustodyLaunchHighWaterV2(highWater);
  if (canonical.toString("utf8") !== text) {
    fail("high_water_noncanonical");
  }
  return Object.freeze({ ...highWater });
}

function verifyHighWaterLineage(
  journalBytes,
  journalState,
  sourceGate,
  highWaterBytes,
) {
  if (highWaterBytes === null) {
    return Object.freeze({
      current: null,
      matches_current: false,
      advance_required: true,
      bootstrap_required: true,
    });
  }
  const highWater = parseHighWater(highWaterBytes);
  if (highWater.source_composition_id !== sourceGate.composition_id) {
    fail("high_water_source_composition_mismatch");
  }
  if (highWater.sequence > journalState.sequence) {
    fail("high_water_sequence_rollback");
  }

  const lines = journalLines(journalBytes);
  if (highWater.sequence > lines.length) {
    fail("high_water_sequence_missing");
  }
  let event;
  try {
    event = JSON.parse(lines[highWater.sequence - 1]);
  } catch {
    fail("high_water_event_invalid");
  }
  if (
    event?.state !== "active" ||
    event?.generation !== highWater.generation ||
    event?.event_sha256 !== highWater.tip_sha256
  ) {
    fail("high_water_lineage_mismatch");
  }

  const matchesCurrent =
    highWater.sequence === journalState.sequence &&
    highWater.generation === journalState.generation &&
    highWater.tip_sha256 === journalState.tip_sha256;
  return Object.freeze({
    current: highWater,
    matches_current: matchesCurrent,
    advance_required: !matchesCurrent,
    bootstrap_required: false,
  });
}

function held(reason, sourceCompositionId = null, candidate = null) {
  return Object.freeze({
    ready: false,
    marker: VOID_BUY_VOID_CUSTODY_LAUNCH_AUTHORITY_V2,
    version: 2,
    reason,
    source_composition_id: sourceCompositionId,
    sequence: candidate?.sequence ?? null,
    generation: candidate?.generation ?? null,
    tip_sha256: candidate?.tip_sha256 ?? null,
    activation_receipt_id: null,
    activation_receipt_sha256: null,
    activation_signer: null,
    sovereign_signer: null,
    high_water_matches_current: false,
    high_water_advance_required: true,
    candidate_high_water_json: candidate?.json ?? null,
    candidate_high_water_sha256: candidate?.sha256 ?? null,
    operator_home_anchor_read: false,
    custody_high_water_write_performed: false,
    custody_reserve_method_enabled: false,
    custody_recover_method_enabled: false,
    production_allocation_mutation_ready: false,
    funds_movement: false,
  });
}

function classifyCore({
  source_gate,
  generation_journal_bytes,
  activation_receipt_bytes,
  custody_high_water_bytes,
  now_ms,
  expected_activation_signer,
  expected_sovereign_signer,
}) {
  let sourceGate = null;
  let candidate = null;
  try {
    sourceGate = normalizedSourceGate(source_gate);
    const journalState = activeJournalState(generation_journal_bytes);
    const candidateBytes = buildBuyVoidCustodyLaunchHighWaterV2({
      source_composition_id: sourceGate.composition_id,
      sequence: journalState.sequence,
      generation: journalState.generation,
      tip_sha256: journalState.tip_sha256,
    });
    candidate = Object.freeze({
      sequence: journalState.sequence,
      generation: journalState.generation,
      tip_sha256: journalState.tip_sha256,
      json: candidateBytes.toString("utf8"),
      sha256: sha256Id(candidateBytes),
    });

    const { receipt, receipt_sha256 } = parseReceipt(
      activation_receipt_bytes,
      sourceGate,
      now_ms,
    );
    if (
      receipt.activation_generation !== journalState.generation ||
      receipt.generation_tip_sha256 !== journalState.tip_sha256
    ) {
      fail("receipt_generation_mismatch");
    }
    const signed = verifyReceiptSignatures(
      receipt,
      expected_activation_signer,
      expected_sovereign_signer,
    );

    const highWater = verifyHighWaterLineage(
      generation_journal_bytes,
      journalState,
      sourceGate,
      custody_high_water_bytes,
    );
    if (highWater.bootstrap_required) {
      return held(
        "custody_launch_high_water_bootstrap_required",
        sourceGate.composition_id,
        candidate,
      );
    }
    if (highWater.advance_required) {
      return held(
        "custody_launch_high_water_advance_required",
        sourceGate.composition_id,
        candidate,
      );
    }

    return Object.freeze({
      ready: true,
      marker: VOID_BUY_VOID_CUSTODY_LAUNCH_AUTHORITY_V2,
      version: 2,
      reason: null,
      source_composition_id: sourceGate.composition_id,
      sequence: journalState.sequence,
      generation: journalState.generation,
      tip_sha256: journalState.tip_sha256,
      activation_receipt_id: receipt.activation_receipt_id,
      activation_receipt_sha256: receipt_sha256,
      activation_signer: signed.activation_signer,
      sovereign_signer: signed.sovereign_signer,
      high_water_matches_current: true,
      high_water_advance_required: false,
      candidate_high_water_json: candidate.json,
      candidate_high_water_sha256: candidate.sha256,
      operator_home_anchor_read: false,
      custody_high_water_write_performed: false,
      custody_reserve_method_enabled: false,
      custody_recover_method_enabled: false,
      production_allocation_mutation_ready: false,
      funds_movement: false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "custody_launch_authority_held";
    const reason = message.startsWith("custody_launch_authority_")
      ? message.slice("custody_launch_authority_".length)
      : "held";
    return held(reason, sourceGate?.composition_id ?? null, candidate);
  }
}

export function readBuyVoidCustodyLaunchAuthorityV2({
  generation_journal_bytes,
  activation_receipt_bytes,
  custody_high_water_bytes,
  now_ms = Date.now(),
}) {
  const sourceGate = readBuyLaunchSourceGateV1();
  return classifyCore({
    source_gate: sourceGate,
    generation_journal_bytes,
    activation_receipt_bytes,
    custody_high_water_bytes,
    now_ms,
    expected_activation_signer:
      VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1,
    expected_sovereign_signer:
      VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1,
  });
}

export function testOnlyClassifyBuyVoidCustodyLaunchAuthorityV2({
  source_gate,
  generation_journal_bytes,
  activation_receipt_bytes,
  custody_high_water_bytes,
  now_ms,
  expected_activation_signer,
  expected_sovereign_signer,
}) {
  return classifyCore({
    source_gate,
    generation_journal_bytes,
    activation_receipt_bytes,
    custody_high_water_bytes,
    now_ms,
    expected_activation_signer,
    expected_sovereign_signer,
  });
}

export function testOnlyBuildGenerationJournalEventV2(input) {
  return buildBuyLaunchGenerationEventV1(input);
}
