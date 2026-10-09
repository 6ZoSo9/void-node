import crypto from "node:crypto";

export const VOID_BUY_VOID_CUSTODY_HIGH_WATER_TRANSITION_FENCE_V1 =
  "VOID_BUY_VOID_CUSTODY_HIGH_WATER_TRANSITION_FENCE_V1";

export const VOID_BUY_VOID_CUSTODY_HIGH_WATER_TRANSITION_FENCE_POLICY_V1 =
  Object.freeze({
    source_only_planner: true,
    create_only_fence_required: true,
    fence_record_deletion_allowed: false,
    stale_fence_automatic_takeover: false,
    transition_slot_keyed_by_prior_high_water: true,
    competing_successor_same_prior_must_conflict: true,
    exact_next_high_water_bytes_stored: true,
    recovery_from_prior_or_exact_next_only: true,
    removable_lock_required: false,
    lock_release_fsync_dependency: false,
    filesystem_write_implemented: false,
    service_mounted: false,
    custody_reserve_method_enabled: false,
    custody_recover_method_enabled: false,
    production_allocation_mutation_ready: false,
    funds_movement: false,
  });

const HIGH_WATER_MARKER = "VOID_BUY_VOID_CUSTODY_LAUNCH_HIGH_WATER_V2";
const HIGH_WATER_KEYS = Object.freeze([
  "generation",
  "journal_prefix_sha256",
  "marker",
  "sequence",
  "source_composition_id",
  "state",
  "tip_sha256",
  "version",
]);
const FENCE_KEYS = Object.freeze([
  "marker",
  "version",
  "transition_slot_id",
  "source_composition_id",
  "prior_high_water_sha256",
  "prior_sequence",
  "prior_generation",
  "prior_tip_sha256",
  "next_high_water_sha256",
  "next_sequence",
  "next_generation",
  "next_tip_sha256",
  "next_journal_prefix_sha256",
  "next_high_water_base64",
]);

const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const BYTES32 = /^0x[0-9a-f]{64}$/u;
const SLOT_ID = /^voidchwf1_[0-9a-f]{64}$/u;
const MAX_HIGH_WATER_BYTES = 16 * 1024;
const MAX_FENCE_BYTES = 64 * 1024;

function fail(reason) {
  throw new Error("custody_hw_transition_fence_" + reason);
}

function sha256Id(bytes) {
  return "sha256:" +
    crypto.createHash("sha256").update(bytes).digest("hex");
}

function canonicalJsonBytes(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");
}

function exactKeys(value, keys, reason) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(reason);
  }
  const actual = Object.keys(value);
  const expected = [...keys];
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(reason);
  }
  return value;
}

function parseHighWater(bytes, label) {
  if (
    !Buffer.isBuffer(bytes) ||
    bytes.length < 1 ||
    bytes.length > MAX_HIGH_WATER_BYTES
  ) {
    fail(label + "_size_invalid");
  }
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail(label + "_json_invalid");
  }
  const highWater = exactKeys(
    value,
    [
      "marker",
      "version",
      "source_composition_id",
      "sequence",
      "generation",
      "state",
      "tip_sha256",
      "journal_prefix_sha256",
    ],
    label + "_shape_invalid",
  );
  if (
    highWater.marker !== HIGH_WATER_MARKER ||
    highWater.version !== 2 ||
    !SHA256_ID.test(String(highWater.source_composition_id || "")) ||
    !Number.isSafeInteger(highWater.sequence) ||
    highWater.sequence < 1 ||
    !BYTES32.test(String(highWater.generation || "")) ||
    highWater.state !== "active" ||
    !SHA256_ID.test(String(highWater.tip_sha256 || "")) ||
    !SHA256_ID.test(String(highWater.journal_prefix_sha256 || ""))
  ) {
    fail(label + "_semantics_invalid");
  }
  if (!canonicalJsonBytes(highWater).equals(bytes)) {
    fail(label + "_noncanonical");
  }
  return Object.freeze({ ...highWater });
}

function deriveSlotId(sourceCompositionId, priorSha256) {
  const material = Buffer.from(
    [
      VOID_BUY_VOID_CUSTODY_HIGH_WATER_TRANSITION_FENCE_V1,
      sourceCompositionId,
      priorSha256 === null ? "bootstrap" : priorSha256,
    ].join("\n"),
    "utf8",
  );
  return "voidchwf1_" +
    crypto.createHash("sha256").update(material).digest("hex");
}

export function buildBuyVoidCustodyHighWaterTransitionFenceV1({
  prior_high_water_bytes = null,
  next_high_water_bytes,
} = {}) {
  if (
    prior_high_water_bytes !== null &&
    !Buffer.isBuffer(prior_high_water_bytes)
  ) {
    fail("prior_type_invalid");
  }
  const next = parseHighWater(
    next_high_water_bytes,
    "next_high_water",
  );
  const prior = prior_high_water_bytes === null
    ? null
    : parseHighWater(prior_high_water_bytes, "prior_high_water");

  if (prior) {
    if (prior.source_composition_id !== next.source_composition_id) {
      fail("source_composition_changed");
    }
    if (next.sequence < prior.sequence) {
      fail("rollback_forbidden");
    }
    if (next.sequence === prior.sequence) {
      if (next_high_water_bytes.equals(prior_high_water_bytes)) {
        return Object.freeze({
          status: "unchanged",
          transition_required: false,
          source_composition_id: next.source_composition_id,
          transition_slot_id: null,
          record_bytes: null,
          next_high_water_bytes: Buffer.from(next_high_water_bytes),
          funds_moved: false,
        });
      }
      fail("same_sequence_conflict");
    }
  }

  const priorSha = prior_high_water_bytes === null
    ? null
    : sha256Id(prior_high_water_bytes);
  const slotId = deriveSlotId(next.source_composition_id, priorSha);
  const record = Object.freeze({
    marker: VOID_BUY_VOID_CUSTODY_HIGH_WATER_TRANSITION_FENCE_V1,
    version: 1,
    transition_slot_id: slotId,
    source_composition_id: next.source_composition_id,
    prior_high_water_sha256: priorSha,
    prior_sequence: prior?.sequence ?? null,
    prior_generation: prior?.generation ?? null,
    prior_tip_sha256: prior?.tip_sha256 ?? null,
    next_high_water_sha256: sha256Id(next_high_water_bytes),
    next_sequence: next.sequence,
    next_generation: next.generation,
    next_tip_sha256: next.tip_sha256,
    next_journal_prefix_sha256: next.journal_prefix_sha256,
    next_high_water_base64: next_high_water_bytes.toString("base64"),
  });
  const recordBytes = canonicalJsonBytes(record);
  if (recordBytes.length > MAX_FENCE_BYTES) {
    fail("record_size_invalid");
  }
  return Object.freeze({
    status: "transition",
    transition_required: true,
    source_composition_id: next.source_composition_id,
    transition_slot_id: slotId,
    record_bytes: Buffer.from(recordBytes),
    record_sha256: sha256Id(recordBytes),
    prior_high_water_sha256: priorSha,
    next_high_water_sha256: record.next_high_water_sha256,
    next_high_water_bytes: Buffer.from(next_high_water_bytes),
    funds_moved: false,
  });
}

export function parseBuyVoidCustodyHighWaterTransitionFenceV1(bytes) {
  if (
    !Buffer.isBuffer(bytes) ||
    bytes.length < 1 ||
    bytes.length > MAX_FENCE_BYTES
  ) {
    fail("record_size_invalid");
  }
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("record_json_invalid");
  }
  const record = exactKeys(value, FENCE_KEYS, "record_shape_invalid");
  if (
    record.marker !== VOID_BUY_VOID_CUSTODY_HIGH_WATER_TRANSITION_FENCE_V1 ||
    record.version !== 1 ||
    !SLOT_ID.test(String(record.transition_slot_id || "")) ||
    !SHA256_ID.test(String(record.source_composition_id || "")) ||
    !(record.prior_high_water_sha256 === null ||
      SHA256_ID.test(String(record.prior_high_water_sha256 || ""))) ||
    (
      record.prior_high_water_sha256 === null
        ? (
            record.prior_sequence !== null ||
            record.prior_generation !== null ||
            record.prior_tip_sha256 !== null
          )
        : (
            !Number.isSafeInteger(record.prior_sequence) ||
            record.prior_sequence < 1 ||
            !BYTES32.test(String(record.prior_generation || "")) ||
            !SHA256_ID.test(String(record.prior_tip_sha256 || ""))
          )
    ) ||
    !SHA256_ID.test(String(record.next_high_water_sha256 || "")) ||
    !Number.isSafeInteger(record.next_sequence) ||
    record.next_sequence < 1 ||
    !BYTES32.test(String(record.next_generation || "")) ||
    !SHA256_ID.test(String(record.next_tip_sha256 || "")) ||
    !SHA256_ID.test(String(record.next_journal_prefix_sha256 || "")) ||
    typeof record.next_high_water_base64 !== "string" ||
    record.next_high_water_base64.length < 1
  ) {
    fail("record_semantics_invalid");
  }
  const nextBytes = Buffer.from(record.next_high_water_base64, "base64");
  if (
    nextBytes.toString("base64") !== record.next_high_water_base64 ||
    sha256Id(nextBytes) !== record.next_high_water_sha256
  ) {
    fail("record_next_bytes_invalid");
  }
  const next = parseHighWater(nextBytes, "record_next_high_water");
  if (
    next.source_composition_id !== record.source_composition_id ||
    next.sequence !== record.next_sequence ||
    next.generation !== record.next_generation ||
    next.tip_sha256 !== record.next_tip_sha256 ||
    next.journal_prefix_sha256 !== record.next_journal_prefix_sha256
  ) {
    fail("record_next_binding_invalid");
  }
  if (
    record.prior_high_water_sha256 !== null &&
    (
      record.next_sequence <= record.prior_sequence ||
      (
        record.next_generation === record.prior_generation &&
        record.next_tip_sha256 === record.prior_tip_sha256
      )
    )
  ) {
    fail("record_transition_progress_invalid");
  }
  const expectedSlot = deriveSlotId(
    record.source_composition_id,
    record.prior_high_water_sha256,
  );
  if (record.transition_slot_id !== expectedSlot) {
    fail("record_slot_invalid");
  }
  if (!canonicalJsonBytes(record).equals(bytes)) {
    fail("record_noncanonical");
  }
  return Object.freeze({
    record: Object.freeze({ ...record }),
    next_high_water_bytes: Buffer.from(nextBytes),
    record_sha256: sha256Id(bytes),
  });
}

export function classifyBuyVoidCustodyHighWaterTransitionFenceSlotV1({
  expected_record_bytes,
  observed_record_bytes = null,
} = {}) {
  const expected = parseBuyVoidCustodyHighWaterTransitionFenceV1(
    expected_record_bytes,
  );
  if (observed_record_bytes === null) {
    return Object.freeze({
      ready: false,
      status: "create_required",
      reason: "transition_fence_record_absent",
      transition_slot_id: expected.record.transition_slot_id,
      create_only_record_bytes: Buffer.from(expected_record_bytes),
      fence_record_deletion_allowed: false,
      funds_moved: false,
    });
  }
  const observed = parseBuyVoidCustodyHighWaterTransitionFenceV1(
    observed_record_bytes,
  );
  if (
    observed.record.transition_slot_id !==
    expected.record.transition_slot_id
  ) {
    fail("observed_slot_mismatch");
  }
  if (!observed_record_bytes.equals(expected_record_bytes)) {
    fail("competing_successor_same_prior");
  }
  return Object.freeze({
    ready: true,
    status: "exists_same_transition",
    reason: null,
    transition_slot_id: expected.record.transition_slot_id,
    record_sha256: expected.record_sha256,
    fence_record_deletion_allowed: false,
    funds_moved: false,
  });
}

export function classifyBuyVoidCustodyHighWaterTransitionRecoveryV1({
  fence_record_bytes,
  observed_current_high_water_bytes = null,
} = {}) {
  const parsed = parseBuyVoidCustodyHighWaterTransitionFenceV1(
    fence_record_bytes,
  );
  const record = parsed.record;
  if (observed_current_high_water_bytes === null) {
    if (record.prior_high_water_sha256 !== null) {
      fail("current_high_water_missing");
    }
    return Object.freeze({
      ready: true,
      status: "resume_required",
      reason: null,
      transition_slot_id: record.transition_slot_id,
      next_high_water_bytes: Buffer.from(parsed.next_high_water_bytes),
      transition_fence_must_remain: true,
      funds_moved: false,
    });
  }

  const current = parseHighWater(
    observed_current_high_water_bytes,
    "observed_current_high_water",
  );
  if (current.source_composition_id !== record.source_composition_id) {
    fail("current_source_composition_mismatch");
  }
  const currentSha = sha256Id(observed_current_high_water_bytes);
  if (currentSha === record.next_high_water_sha256) {
    return Object.freeze({
      ready: true,
      status: "committed",
      reason: null,
      transition_slot_id: record.transition_slot_id,
      next_high_water_bytes: Buffer.from(parsed.next_high_water_bytes),
      transition_fence_must_remain: true,
      funds_moved: false,
    });
  }
  if (currentSha === record.prior_high_water_sha256) {
    return Object.freeze({
      ready: true,
      status: "resume_required",
      reason: null,
      transition_slot_id: record.transition_slot_id,
      next_high_water_bytes: Buffer.from(parsed.next_high_water_bytes),
      transition_fence_must_remain: true,
      funds_moved: false,
    });
  }
  fail("current_not_prior_or_next");
}
