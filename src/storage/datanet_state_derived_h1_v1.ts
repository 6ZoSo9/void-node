// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import { createHash } from "node:crypto";

export const VOID_DATANET_STATE_DERIVED_H1_V1 = "VOID_DATANET_STATE_DERIVED_H1_V1";
export const VOID_DATANET_OBJECT_QUOTA_DOMAIN_V1 = "VOID-DATANET-OBJECT-QUOTA-V1\0";

const HEX64 = /^[0-9a-f]{64}$/;
const DECIMAL = /^(0|[1-9][0-9]*)$/;
const ROOT_IDENTITY = /^(0|[1-9][0-9]*):(0|[1-9][0-9]*)$/;
const MAX_U64 = (1n << 64n) - 1n;
const MAX_U16 = (1n << 16n) - 1n;

export type DatanetReplicaSlotObservationV1 =
  | { status: "missing" }
  | { status: "valid"; dev: string; ino: string; bytes: number; sha256: string }
  | { status: "invalid"; detail: string }
  | { status: "foreign"; detail: string };

export type DatanetH1ObservationV1 = {
  v: 1;
  root_identity: string;
  quota_key: string;
  expected_sha256: string;
  expected_bytes: number;
  mutation_custody_retired: boolean;
  extra_leaf_count: number;
  s0: DatanetReplicaSlotObservationV1;
  s1: DatanetReplicaSlotObservationV1;
};

export type DatanetH1ClassificationV1 = {
  v: 1;
  format: typeof VOID_DATANET_STATE_DERIVED_H1_V1;
  root_identity: string;
  quota_key: string;
  decision: "AUTHORIZE_H1" | "DENY_H1" | "HOLD";
  reason:
    | "S0_ONLY_VERIFIED"
    | "S0_S1_VERIFIED_CAP_REACHED"
    | "MUTATION_CUSTODY_ACTIVE"
    | "EXTRA_LEAF_PRESENT"
    | "S0_MISSING"
    | "S0_INVALID"
    | "S0_FOREIGN"
    | "S1_INVALID"
    | "S1_FOREIGN"
    | "SLOT_BINDING_MISMATCH"
    | "SLOT_ALIAS";
};

function fail(code: string, detail: string): never {
  throw new Error(`${VOID_DATANET_STATE_DERIVED_H1_V1}:${code}:${detail}`);
}

function exactKeys(value: object, expected: readonly string[], code: string): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail(code, actual.join(","));
  }
}

function requireHex64(value: unknown, code: string): string {
  if (typeof value !== "string" || !HEX64.test(value)) fail(code, String(value));
  return value;
}

function requireDecimal(value: unknown, code: string): string {
  if (typeof value !== "string" || !DECIMAL.test(value)) fail(code, String(value));
  return value;
}

function requireRootIdentity(value: unknown): string {
  if (typeof value !== "string" || !ROOT_IDENTITY.test(value)) {
    fail("ROOT_IDENTITY_INVALID", String(value));
  }
  return value;
}

function requireSafeBytes(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) fail("EXPECTED_BYTES_INVALID", String(value));
  return Number(value);
}

function requireNonnegativeSafeInteger(value: unknown, code: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) fail(code, String(value));
  return Number(value);
}

function parseSlot(value: unknown, label: "s0" | "s1"): DatanetReplicaSlotObservationV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("SLOT_INVALID", label);
  const row = value as Record<string, unknown>;
  if (row.status === "missing") {
    exactKeys(row, ["status"], "SLOT_KEYS_INVALID");
    return { status: "missing" };
  }
  if (row.status === "invalid" || row.status === "foreign") {
    exactKeys(row, ["status", "detail"], "SLOT_KEYS_INVALID");
    if (typeof row.detail !== "string" || row.detail.length < 1 || row.detail.length > 256) {
      fail("SLOT_DETAIL_INVALID", label);
    }
    return { status: row.status, detail: row.detail };
  }
  if (row.status === "valid") {
    exactKeys(row, ["status", "dev", "ino", "bytes", "sha256"], "SLOT_KEYS_INVALID");
    const dev = requireDecimal(row.dev, "SLOT_IDENTITY_INVALID");
    const ino = requireDecimal(row.ino, "SLOT_IDENTITY_INVALID");
    if (!Number.isSafeInteger(row.bytes) || Number(row.bytes) <= 0) fail("SLOT_BYTES_INVALID", label);
    return {
      status: "valid",
      dev,
      ino,
      bytes: Number(row.bytes),
      sha256: requireHex64(row.sha256, "SLOT_SHA256_INVALID"),
    };
  }
  fail("SLOT_STATUS_INVALID", `${label}:${String(row.status)}`);
}

export function canonicalDatanetRootIdentityV1(dev: string, ino: string): string {
  return `${requireDecimal(dev, "ROOT_DEV_INVALID")}:${requireDecimal(ino, "ROOT_INO_INVALID")}`;
}

export function datanetReplicaLeafNameV1(quotaKey: string, index: 0 | 1): string {
  const key = requireHex64(quotaKey, "QUOTA_KEY_INVALID");
  if (index !== 0 && index !== 1) fail("SLOT_INDEX_INVALID", String(index));
  return `datanet-${key}-s${index}.v1`;
}

export function deriveDatanetObjectQuotaKeyV1(input: {
  chain_id: bigint;
  genesis_hash: string;
  commitment_type: bigint;
  payload_sha256: string;
}): string {
  const { chain_id, genesis_hash, commitment_type, payload_sha256 } = input;
  if (typeof chain_id !== "bigint" || chain_id < 0n || chain_id > MAX_U64) fail("CHAIN_ID_INVALID", String(chain_id));
  if (typeof commitment_type !== "bigint" || commitment_type < 0n || commitment_type > MAX_U16) {
    fail("COMMITMENT_TYPE_INVALID", String(commitment_type));
  }
  const genesis = Buffer.from(requireHex64(genesis_hash, "GENESIS_HASH_INVALID"), "hex");
  const payload = Buffer.from(requireHex64(payload_sha256, "PAYLOAD_SHA256_INVALID"), "hex");
  const chain = Buffer.alloc(8);
  chain.writeBigUInt64BE(chain_id);
  const kind = Buffer.alloc(2);
  kind.writeUInt16BE(Number(commitment_type));
  return createHash("sha256")
    .update(Buffer.from(VOID_DATANET_OBJECT_QUOTA_DOMAIN_V1, "ascii"))
    .update(chain)
    .update(genesis)
    .update(kind)
    .update(payload)
    .digest("hex");
}

export function parseDatanetH1ObservationV1(value: unknown): DatanetH1ObservationV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("OBSERVATION_INVALID", "not-object");
  const row = value as Record<string, unknown>;
  exactKeys(row, [
    "v",
    "root_identity",
    "quota_key",
    "expected_sha256",
    "expected_bytes",
    "mutation_custody_retired",
    "extra_leaf_count",
    "s0",
    "s1",
  ], "OBSERVATION_KEYS_INVALID");
  if (row.v !== 1) fail("OBSERVATION_VERSION_INVALID", String(row.v));
  if (typeof row.mutation_custody_retired !== "boolean") fail("CUSTODY_STATE_INVALID", String(row.mutation_custody_retired));
  return {
    v: 1,
    root_identity: requireRootIdentity(row.root_identity),
    quota_key: requireHex64(row.quota_key, "QUOTA_KEY_INVALID"),
    expected_sha256: requireHex64(row.expected_sha256, "EXPECTED_SHA256_INVALID"),
    expected_bytes: requireSafeBytes(row.expected_bytes),
    mutation_custody_retired: row.mutation_custody_retired,
    extra_leaf_count: requireNonnegativeSafeInteger(row.extra_leaf_count, "EXTRA_LEAF_COUNT_INVALID"),
    s0: parseSlot(row.s0, "s0"),
    s1: parseSlot(row.s1, "s1"),
  };
}

function classification(
  observation: DatanetH1ObservationV1,
  decision: DatanetH1ClassificationV1["decision"],
  reason: DatanetH1ClassificationV1["reason"],
): DatanetH1ClassificationV1 {
  return Object.freeze({
    v: 1,
    format: VOID_DATANET_STATE_DERIVED_H1_V1,
    root_identity: observation.root_identity,
    quota_key: observation.quota_key,
    decision,
    reason,
  });
}

function validSlotMatchesExpected(slot: Extract<DatanetReplicaSlotObservationV1, { status: "valid" }>, observation: DatanetH1ObservationV1): boolean {
  return slot.bytes === observation.expected_bytes && slot.sha256 === observation.expected_sha256;
}

export function classifyDatanetH1StateV1(value: unknown): DatanetH1ClassificationV1 {
  const observation = parseDatanetH1ObservationV1(value);

  if (!observation.mutation_custody_retired) return classification(observation, "HOLD", "MUTATION_CUSTODY_ACTIVE");
  if (observation.extra_leaf_count !== 0) return classification(observation, "HOLD", "EXTRA_LEAF_PRESENT");

  if (observation.s0.status === "missing") return classification(observation, "HOLD", "S0_MISSING");
  if (observation.s0.status === "invalid") return classification(observation, "HOLD", "S0_INVALID");
  if (observation.s0.status === "foreign") return classification(observation, "HOLD", "S0_FOREIGN");
  if (!validSlotMatchesExpected(observation.s0, observation)) return classification(observation, "HOLD", "SLOT_BINDING_MISMATCH");

  if (observation.s1.status === "invalid") return classification(observation, "HOLD", "S1_INVALID");
  if (observation.s1.status === "foreign") return classification(observation, "HOLD", "S1_FOREIGN");
  if (observation.s1.status === "missing") return classification(observation, "AUTHORIZE_H1", "S0_ONLY_VERIFIED");
  if (!validSlotMatchesExpected(observation.s1, observation)) return classification(observation, "HOLD", "SLOT_BINDING_MISMATCH");
  if (observation.s0.dev === observation.s1.dev && observation.s0.ino === observation.s1.ino) {
    return classification(observation, "HOLD", "SLOT_ALIAS");
  }
  return classification(observation, "DENY_H1", "S0_S1_VERIFIED_CAP_REACHED");
}
