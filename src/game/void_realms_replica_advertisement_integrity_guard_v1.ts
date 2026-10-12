// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import { cidForJson } from "../util/cid.js";
import {
  VOID_REALMS_REPLICA_ADVERTISEMENT_MARKER,
  materializeVoidRealmsReplicaAdvertisementV1,
} from "./void_realms_single_canonical_world_region_checkpoint_handoff_v1.js";
import type { VoidRealmsPlayerNodeReplicaAdvertisementV1 } from "./void_realms_single_canonical_world_region_checkpoint_handoff_v1.js";

export const VOID_REALMS_REPLICA_ADVERTISEMENT_INTEGRITY_GUARD_MARKER =
  "VOID_REALMS_REPLICA_ADVERTISEMENT_INTEGRITY_GUARD_V1" as const;

export interface VoidRealmsReplicaAdvertisementExpectationV1 {
  world_id: string;
  node_id: string;
  region_checkpoint_id: string;
  evaluated_at_utc: string;
  max_age_seconds: number;
  max_future_skew_seconds: number;
}

export interface VoidRealmsReplicaAdvertisementVerificationV1 {
  marker: typeof VOID_REALMS_REPLICA_ADVERTISEMENT_INTEGRITY_GUARD_MARKER;
  version: 1;
  verified: true;
  advertisement_id: string;
  world_id: string;
  node_id: string;
  region_checkpoint_id: string;
  public_object_count: number;
  available_bytes: number;
  age_seconds: number;
  gameplay_authority: false;
  checkpoint_signing_authority: false;
  handoff_acceptance_authority: false;
}

export type VoidRealmsGuardedReplicaAdvertisementInputV1 =
  Parameters<typeof materializeVoidRealmsReplicaAdvertisementV1>[0] & {
    evaluated_at_utc: string;
    max_age_seconds: number;
    max_future_skew_seconds: number;
  };

const HEX_64 = /^[0-9a-f]{64}$/;
const WORLD_ID = /^voidrw1_[0-9a-f]{64}$/;
const NODE_ID = /^voidnode1_[0-9a-f]{64}$/;
const REGION_CHECKPOINT_ID = /^voidrcp1_[0-9a-f]{64}$/;
const ADVERTISEMENT_ID = /^voidrra1_[0-9a-f]{64}$/;
const UTC =
  /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\dZ$/;

const ADVERTISEMENT_KEYS = [
  "advertisement_id",
  "marker",
  "version",
  "world_id",
  "node_id",
  "region_checkpoint_id",
  "public_object_roots_sha256",
  "available_bytes",
  "recorded_at_utc",
  "status",
  "gameplay_authority",
  "checkpoint_signing_authority",
  "handoff_acceptance_authority",
] as const;

const EXPECTATION_KEYS = [
  "world_id",
  "node_id",
  "region_checkpoint_id",
  "evaluated_at_utc",
  "max_age_seconds",
  "max_future_skew_seconds",
] as const;

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function compareUtf16(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  assertCondition(
    value !== null && typeof value === "object" && !Array.isArray(value),
    `${label} must be an object`,
  );
  return value as Record<string, unknown>;
}

function assertExactKeys(
  value: unknown,
  label: string,
  expected: readonly string[],
): void {
  const actual = Object.keys(requireRecord(value, label)).sort(compareUtf16);
  const wanted = [...expected].sort(compareUtf16);
  assertCondition(
    JSON.stringify(actual) === JSON.stringify(wanted),
    `${label} keys mismatch`,
  );
}

function requireString(value: unknown, label: string, pattern: RegExp): string {
  assertCondition(
    typeof value === "string" && value === value.trim() && pattern.test(value),
    `${label} has invalid format`,
  );
  return value;
}

function requireSafeInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number {
  assertCondition(
    Number.isSafeInteger(value) &&
      (value as number) >= minimum &&
      (value as number) <= maximum,
    `${label} must be a safe integer in ${minimum}..${maximum}`,
  );
  return value as number;
}

function requireUtc(value: unknown, label: string): string {
  const text = requireString(value, label, UTC);
  assertCondition(!Number.isNaN(Date.parse(text)), `${label} is invalid`);
  return text;
}

function replicaAdvertisementBodyV1(
  advertisement: VoidRealmsPlayerNodeReplicaAdvertisementV1,
) {
  return {
    marker: advertisement.marker,
    version: advertisement.version,
    world_id: advertisement.world_id,
    node_id: advertisement.node_id,
    region_checkpoint_id: advertisement.region_checkpoint_id,
    public_object_roots_sha256:
      advertisement.public_object_roots_sha256,
    available_bytes: advertisement.available_bytes,
    recorded_at_utc: advertisement.recorded_at_utc,
    status: advertisement.status,
    gameplay_authority: advertisement.gameplay_authority,
    checkpoint_signing_authority:
      advertisement.checkpoint_signing_authority,
    handoff_acceptance_authority:
      advertisement.handoff_acceptance_authority,
  };
}

export async function verifyVoidRealmsReplicaAdvertisementContentAddressV1(
  advertisement: VoidRealmsPlayerNodeReplicaAdvertisementV1,
  expectation: VoidRealmsReplicaAdvertisementExpectationV1,
): Promise<VoidRealmsReplicaAdvertisementVerificationV1> {
  assertExactKeys(advertisement, "replica advertisement", ADVERTISEMENT_KEYS);
  assertExactKeys(expectation, "replica expectation", EXPECTATION_KEYS);

  assertCondition(
    advertisement.marker === VOID_REALMS_REPLICA_ADVERTISEMENT_MARKER,
    "replica advertisement marker mismatch",
  );
  assertCondition(
    advertisement.version === 1,
    "replica advertisement version mismatch",
  );
  requireString(
    advertisement.advertisement_id,
    "advertisement_id",
    ADVERTISEMENT_ID,
  );
  requireString(advertisement.world_id, "advertisement world_id", WORLD_ID);
  requireString(advertisement.node_id, "advertisement node_id", NODE_ID);
  requireString(
    advertisement.region_checkpoint_id,
    "advertisement region_checkpoint_id",
    REGION_CHECKPOINT_ID,
  );

  assertCondition(
    Array.isArray(advertisement.public_object_roots_sha256) &&
      advertisement.public_object_roots_sha256.length >= 1 &&
      advertisement.public_object_roots_sha256.length <= 4096,
    "replica advertisement requires 1..4096 object roots",
  );
  const roots = [...advertisement.public_object_roots_sha256];
  for (const root of roots) {
    requireString(root, "public object root", HEX_64);
  }
  assertCondition(
    new Set(roots).size === roots.length,
    "replica advertisement contains duplicate object roots",
  );
  assertCondition(
    JSON.stringify(roots) === JSON.stringify([...roots].sort(compareUtf16)),
    "replica advertisement object roots are not canonically sorted",
  );

  const availableBytes = requireSafeInteger(
    advertisement.available_bytes,
    "available_bytes",
    1,
    Number.MAX_SAFE_INTEGER,
  );
  const recordedAt = requireUtc(
    advertisement.recorded_at_utc,
    "advertisement recorded_at_utc",
  );
  assertCondition(
    advertisement.status === "public_replica_available",
    "replica advertisement status mismatch",
  );
  assertCondition(
    advertisement.gameplay_authority === false &&
      advertisement.checkpoint_signing_authority === false &&
      advertisement.handoff_acceptance_authority === false,
    "replica advertisement authority boundary changed",
  );

  const expectedWorldId = requireString(
    expectation.world_id,
    "expected world_id",
    WORLD_ID,
  );
  const expectedNodeId = requireString(
    expectation.node_id,
    "expected node_id",
    NODE_ID,
  );
  const expectedCheckpointId = requireString(
    expectation.region_checkpoint_id,
    "expected region_checkpoint_id",
    REGION_CHECKPOINT_ID,
  );
  const evaluatedAt = requireUtc(
    expectation.evaluated_at_utc,
    "evaluated_at_utc",
  );
  const maxAgeSeconds = requireSafeInteger(
    expectation.max_age_seconds,
    "max_age_seconds",
    1,
    86400,
  );
  const maxFutureSkewSeconds = requireSafeInteger(
    expectation.max_future_skew_seconds,
    "max_future_skew_seconds",
    0,
    300,
  );

  assertCondition(
    advertisement.world_id === expectedWorldId,
    "replica advertisement world binding mismatch",
  );
  assertCondition(
    advertisement.node_id === expectedNodeId,
    "replica advertisement node binding mismatch",
  );
  assertCondition(
    advertisement.region_checkpoint_id === expectedCheckpointId,
    "replica advertisement checkpoint binding mismatch",
  );

  const ageMs = Date.parse(evaluatedAt) - Date.parse(recordedAt);
  assertCondition(
    ageMs >= -maxFutureSkewSeconds * 1000,
    "replica advertisement is too far in the future",
  );
  assertCondition(
    ageMs <= maxAgeSeconds * 1000,
    "replica advertisement is stale",
  );

  const expectedAdvertisementId =
    `voidrra1_${await cidForJson(replicaAdvertisementBodyV1(advertisement))}`;
  assertCondition(
    advertisement.advertisement_id === expectedAdvertisementId,
    "replica advertisement content address mismatch",
  );

  return {
    marker: VOID_REALMS_REPLICA_ADVERTISEMENT_INTEGRITY_GUARD_MARKER,
    version: 1,
    verified: true,
    advertisement_id: advertisement.advertisement_id,
    world_id: advertisement.world_id,
    node_id: advertisement.node_id,
    region_checkpoint_id: advertisement.region_checkpoint_id,
    public_object_count: roots.length,
    available_bytes: availableBytes,
    age_seconds: Math.floor(ageMs / 1000),
    gameplay_authority: false,
    checkpoint_signing_authority: false,
    handoff_acceptance_authority: false,
  };
}

export async function materializeVoidRealmsReplicaAdvertisementWithIntegrityV1(
  input: VoidRealmsGuardedReplicaAdvertisementInputV1,
): Promise<VoidRealmsPlayerNodeReplicaAdvertisementV1> {
  const {
    evaluated_at_utc: evaluatedAtUtc,
    max_age_seconds: maxAgeSeconds,
    max_future_skew_seconds: maxFutureSkewSeconds,
    ...materializerInput
  } = input;
  const advertisement =
    await materializeVoidRealmsReplicaAdvertisementV1(materializerInput);
  await verifyVoidRealmsReplicaAdvertisementContentAddressV1(advertisement, {
    world_id: materializerInput.world_id,
    node_id: materializerInput.node_id,
    region_checkpoint_id: materializerInput.region_checkpoint_id,
    evaluated_at_utc: evaluatedAtUtc,
    max_age_seconds: maxAgeSeconds,
    max_future_skew_seconds: maxFutureSkewSeconds,
  });
  return advertisement;
}
