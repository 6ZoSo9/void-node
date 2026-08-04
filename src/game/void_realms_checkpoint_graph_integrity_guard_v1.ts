// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import { cidForJson, stableStringify } from "../util/cid.js";
import {
  VOID_REALMS_HANDOFF_MARKER,
  VOID_REALMS_HANDOFF_RECEIPT_MARKER,
  VOID_REALMS_REGION_AUTHORITY_LEASE_MARKER,
  VOID_REALMS_REGION_CHECKPOINT_MARKER,
  VOID_REALMS_REGION_DESCRIPTOR_MARKER,
  VOID_REALMS_WORLD_CHECKPOINT_MARKER,
  VOID_REALMS_WORLD_MANIFEST_MARKER,
  acceptVoidRealmsPlayerRegionHandoffV1,
  planVoidRealmsPlayerRegionHandoffV1,
  regionsAreAdjacentV1,
  validateVoidRealmsRegionCheckpointChainV1,
} from "./void_realms_single_canonical_world_region_checkpoint_handoff_v1.js";
import type {
  VoidRealmsPlayerRegionHandoffReceiptV1,
  VoidRealmsPlayerRegionHandoffV1,
  VoidRealmsRegionAuthorityLeaseV1,
  VoidRealmsRegionCheckpointV1,
  VoidRealmsRegionDescriptorV1,
  VoidRealmsWorldCheckpointV1,
  VoidRealmsWorldManifestV1,
} from "./void_realms_single_canonical_world_region_checkpoint_handoff_v1.js";

export const VOID_REALMS_CHECKPOINT_GRAPH_INTEGRITY_GUARD_MARKER =
  "VOID_REALMS_CHECKPOINT_GRAPH_INTEGRITY_GUARD_V1" as const;

export interface VoidRealmsCheckpointGraphV1 {
  marker: typeof VOID_REALMS_CHECKPOINT_GRAPH_INTEGRITY_GUARD_MARKER;
  version: 1;
  world_checkpoint: VoidRealmsWorldCheckpointV1;
  region_checkpoint_chains: readonly (
    readonly VoidRealmsRegionCheckpointV1[]
  )[];
  authority_leases: readonly VoidRealmsRegionAuthorityLeaseV1[];
}

export interface VoidRealmsCheckpointGraphVerificationV1 {
  marker: typeof VOID_REALMS_CHECKPOINT_GRAPH_INTEGRITY_GUARD_MARKER;
  version: 1;
  verified: true;
  world_id: string;
  world_checkpoint_id: string;
  terminal_region_checkpoint_ids: string[];
  authority_lease_ids: string[];
  gameplay_state_committed: false;
  checkpoint_signing_performed: false;
  handoff_accepted: false;
}

export type VoidRealmsVerifiedHandoffPlanInputV1 =
  Parameters<typeof planVoidRealmsPlayerRegionHandoffV1>[0] & {
    checkpoint_graph: VoidRealmsCheckpointGraphV1;
  };

export type VoidRealmsVerifiedHandoffAcceptanceInputV1 =
  Parameters<typeof acceptVoidRealmsPlayerRegionHandoffV1>[0] & {
    checkpoint_graph: VoidRealmsCheckpointGraphV1;
    manifest: VoidRealmsWorldManifestV1;
    source_region: VoidRealmsRegionDescriptorV1;
    destination_region: VoidRealmsRegionDescriptorV1;
  };

const HEX_64 = /^[0-9a-f]{64}$/;
const HEX_32 = /^[0-9a-f]{32}$/;
const WORLD_ID = /^voidrw1_[0-9a-f]{64}$/;
const REGION_ID = /^voidrr1_[0-9a-f]{64}$/;
const NODE_ID = /^voidnode1_[0-9a-f]{64}$/;
const SESSION_ID = /^voidrps1_[0-9a-f]{64}$/;
const LEASE_ID = /^voidral1_[0-9a-f]{64}$/;
const REGION_CHECKPOINT_ID = /^voidrcp1_[0-9a-f]{64}$/;
const WORLD_CHECKPOINT_ID = /^voidrwc1_[0-9a-f]{64}$/;
const HANDOFF_ID = /^voidrho1_[0-9a-f]{64}$/;
const HANDOFF_RECEIPT_ID = /^voidrhr1_[0-9a-f]{64}$/;
const UTC =
  /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\dZ$/;

const GRAPH_KEYS = [
  "marker",
  "version",
  "world_checkpoint",
  "region_checkpoint_chains",
  "authority_leases",
] as const;

const AUTHORITY_BOUNDARY_KEYS = [
  "world_creation",
  "region_assignment",
  "checkpoint_signing",
  "handoff_acceptance",
  "gameplay_state_commit",
  "network_listener_start",
  "external_connection",
  "server_start",
  "deployment",
  "work_credit_write",
  "wallet_or_signer_access",
  "payment_execution",
  "money_movement",
] as const;

const WORLD_MANIFEST_KEYS = [
  "marker",
  "version",
  "world_id",
  "world_name",
  "single_world_identity",
  "space_id",
  "genesis_seed_sha256",
  "chunk_size_nodes",
  "region_size_chunks",
  "region_size_nodes",
  "minimum_y",
  "maximum_y",
  "checkpoint_interval_ticks",
  "handoff_ttl_seconds",
  "player_nodes_may_serve_public_objects",
  "player_nodes_have_gameplay_authority",
  "region_servers_replaceable",
  "status",
  "authority",
] as const;

const REGION_DESCRIPTOR_KEYS = [
  "marker",
  "version",
  "region_id",
  "world_id",
  "space_id",
  "region_x",
  "region_z",
  "minimum_x",
  "maximum_x",
  "minimum_y",
  "maximum_y",
  "minimum_z",
  "maximum_z",
] as const;

const LEASE_KEYS = [
  "lease_id",
  "marker",
  "version",
  "world_id",
  "region_id",
  "authority_node_id",
  "generation",
  "previous_lease_id",
  "valid_from_utc",
  "valid_until_utc",
  "status",
  "signature_required_for_live_use",
  "signature_present",
  "gameplay_authority_activated",
] as const;

const REGION_CHECKPOINT_KEYS = [
  "checkpoint_id",
  "marker",
  "version",
  "world_id",
  "region_id",
  "authority_lease_id",
  "sequence",
  "tick",
  "parent_checkpoint_id",
  "state_root_sha256",
  "public_object_manifest_root_sha256",
  "event_log_root_sha256",
  "recorded_at_utc",
  "status",
  "signature_required_for_live_use",
  "signature_present",
  "gameplay_state_committed",
] as const;

const WORLD_CHECKPOINT_KEYS = [
  "world_checkpoint_id",
  "marker",
  "version",
  "world_id",
  "epoch",
  "parent_world_checkpoint_id",
  "region_checkpoint_ids",
  "region_set_root_sha256",
  "recorded_at_utc",
  "status",
  "signature_required_for_live_use",
  "signature_present",
  "canonical_world_state_committed",
] as const;

const HANDOFF_KEYS = [
  "handoff_id",
  "marker",
  "version",
  "world_id",
  "world_checkpoint_id",
  "player_session_id",
  "source_region_id",
  "destination_region_id",
  "source_checkpoint_id",
  "destination_checkpoint_id",
  "player_public_state_root_sha256",
  "handoff_nonce_hex",
  "not_before_utc",
  "expires_at_utc",
  "status",
  "raw_player_state_present",
  "destination_gameplay_state_committed",
] as const;

const HANDOFF_RECEIPT_KEYS = [
  "receipt_id",
  "marker",
  "version",
  "handoff_id",
  "world_id",
  "destination_region_id",
  "destination_checkpoint_id",
  "accepted_at_utc",
  "status",
  "gameplay_state_committed",
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

function assertStableEqual(left: unknown, right: unknown, message: string): void {
  assertCondition(stableStringify(left) === stableStringify(right), message);
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
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER,
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

function verifyFalseAuthorityBoundary(value: unknown): void {
  assertExactKeys(value, "world authority boundary", AUTHORITY_BOUNDARY_KEYS);
  const record = requireRecord(value, "world authority boundary");
  for (const key of AUTHORITY_BOUNDARY_KEYS) {
    assertCondition(
      record[key] === false,
      `world authority boundary ${key} must remain false`,
    );
  }
}

function worldManifestBodyV1(manifest: VoidRealmsWorldManifestV1) {
  return {
    marker: manifest.marker,
    version: manifest.version,
    world_name: manifest.world_name,
    single_world_identity: manifest.single_world_identity,
    space_id: manifest.space_id,
    genesis_seed_sha256: manifest.genesis_seed_sha256,
    chunk_size_nodes: manifest.chunk_size_nodes,
    region_size_chunks: manifest.region_size_chunks,
    region_size_nodes: manifest.region_size_nodes,
    minimum_y: manifest.minimum_y,
    maximum_y: manifest.maximum_y,
    checkpoint_interval_ticks: manifest.checkpoint_interval_ticks,
    handoff_ttl_seconds: manifest.handoff_ttl_seconds,
    player_nodes_may_serve_public_objects:
      manifest.player_nodes_may_serve_public_objects,
    player_nodes_have_gameplay_authority:
      manifest.player_nodes_have_gameplay_authority,
    region_servers_replaceable: manifest.region_servers_replaceable,
    status: manifest.status,
    authority: manifest.authority,
  };
}

function regionDescriptorBodyV1(region: VoidRealmsRegionDescriptorV1) {
  return {
    marker: region.marker,
    version: region.version,
    world_id: region.world_id,
    space_id: region.space_id,
    region_x: region.region_x,
    region_z: region.region_z,
    minimum_x: region.minimum_x,
    maximum_x: region.maximum_x,
    minimum_y: region.minimum_y,
    maximum_y: region.maximum_y,
    minimum_z: region.minimum_z,
    maximum_z: region.maximum_z,
  };
}

function leaseBodyV1(lease: VoidRealmsRegionAuthorityLeaseV1) {
  return {
    marker: lease.marker,
    version: lease.version,
    world_id: lease.world_id,
    region_id: lease.region_id,
    authority_node_id: lease.authority_node_id,
    generation: lease.generation,
    previous_lease_id: lease.previous_lease_id,
    valid_from_utc: lease.valid_from_utc,
    valid_until_utc: lease.valid_until_utc,
    status: lease.status,
    signature_required_for_live_use: lease.signature_required_for_live_use,
    signature_present: lease.signature_present,
    gameplay_authority_activated: lease.gameplay_authority_activated,
  };
}

function regionCheckpointBodyV1(checkpoint: VoidRealmsRegionCheckpointV1) {
  return {
    marker: checkpoint.marker,
    version: checkpoint.version,
    world_id: checkpoint.world_id,
    region_id: checkpoint.region_id,
    authority_lease_id: checkpoint.authority_lease_id,
    sequence: checkpoint.sequence,
    tick: checkpoint.tick,
    parent_checkpoint_id: checkpoint.parent_checkpoint_id,
    state_root_sha256: checkpoint.state_root_sha256,
    public_object_manifest_root_sha256:
      checkpoint.public_object_manifest_root_sha256,
    event_log_root_sha256: checkpoint.event_log_root_sha256,
    recorded_at_utc: checkpoint.recorded_at_utc,
    status: checkpoint.status,
    signature_required_for_live_use: checkpoint.signature_required_for_live_use,
    signature_present: checkpoint.signature_present,
    gameplay_state_committed: checkpoint.gameplay_state_committed,
  };
}

function worldCheckpointBodyV1(checkpoint: VoidRealmsWorldCheckpointV1) {
  return {
    marker: checkpoint.marker,
    version: checkpoint.version,
    world_id: checkpoint.world_id,
    epoch: checkpoint.epoch,
    parent_world_checkpoint_id: checkpoint.parent_world_checkpoint_id,
    region_checkpoint_ids: checkpoint.region_checkpoint_ids,
    region_set_root_sha256: checkpoint.region_set_root_sha256,
    recorded_at_utc: checkpoint.recorded_at_utc,
    status: checkpoint.status,
    signature_required_for_live_use: checkpoint.signature_required_for_live_use,
    signature_present: checkpoint.signature_present,
    canonical_world_state_committed: checkpoint.canonical_world_state_committed,
  };
}

function handoffBodyV1(handoff: VoidRealmsPlayerRegionHandoffV1) {
  return {
    marker: handoff.marker,
    version: handoff.version,
    world_id: handoff.world_id,
    world_checkpoint_id: handoff.world_checkpoint_id,
    player_session_id: handoff.player_session_id,
    source_region_id: handoff.source_region_id,
    destination_region_id: handoff.destination_region_id,
    source_checkpoint_id: handoff.source_checkpoint_id,
    destination_checkpoint_id: handoff.destination_checkpoint_id,
    player_public_state_root_sha256: handoff.player_public_state_root_sha256,
    handoff_nonce_hex: handoff.handoff_nonce_hex,
    not_before_utc: handoff.not_before_utc,
    expires_at_utc: handoff.expires_at_utc,
    status: handoff.status,
    raw_player_state_present: handoff.raw_player_state_present,
    destination_gameplay_state_committed:
      handoff.destination_gameplay_state_committed,
  };
}

function handoffReceiptBodyV1(
  receipt: VoidRealmsPlayerRegionHandoffReceiptV1,
) {
  return {
    marker: receipt.marker,
    version: receipt.version,
    handoff_id: receipt.handoff_id,
    world_id: receipt.world_id,
    destination_region_id: receipt.destination_region_id,
    destination_checkpoint_id: receipt.destination_checkpoint_id,
    accepted_at_utc: receipt.accepted_at_utc,
    status: receipt.status,
    gameplay_state_committed: receipt.gameplay_state_committed,
  };
}

export async function verifyVoidRealmsWorldManifestContentAddressV1(
  manifest: VoidRealmsWorldManifestV1,
): Promise<void> {
  assertExactKeys(manifest, "world manifest", WORLD_MANIFEST_KEYS);
  assertCondition(
    manifest.marker === VOID_REALMS_WORLD_MANIFEST_MARKER,
    "world manifest marker mismatch",
  );
  assertCondition(manifest.version === 1, "world manifest version mismatch");
  requireString(manifest.world_id, "world_id", WORLD_ID);
  assertCondition(manifest.world_name === "VOID Realms", "world name mismatch");
  assertCondition(
    manifest.single_world_identity === true,
    "single world identity must remain true",
  );
  assertCondition(manifest.space_id === "surface", "world space ID mismatch");
  requireString(manifest.genesis_seed_sha256, "genesis seed", HEX_64);
  const chunkSize = requireSafeInteger(
    manifest.chunk_size_nodes,
    "chunk size",
    16,
    64,
  );
  const regionChunks = requireSafeInteger(
    manifest.region_size_chunks,
    "region chunk count",
    16,
    256,
  );
  assertCondition(
    manifest.region_size_nodes === chunkSize * regionChunks,
    "region size node derivation mismatch",
  );
  const minimumY = requireSafeInteger(
    manifest.minimum_y,
    "minimum_y",
    -4096,
    0,
  );
  const maximumY = requireSafeInteger(
    manifest.maximum_y,
    "maximum_y",
    1,
    4096,
  );
  assertCondition(maximumY > minimumY, "world vertical bounds are invalid");
  requireSafeInteger(
    manifest.checkpoint_interval_ticks,
    "checkpoint interval",
    60,
    72000,
  );
  requireSafeInteger(manifest.handoff_ttl_seconds, "handoff TTL", 5, 120);
  assertCondition(
    manifest.player_nodes_may_serve_public_objects === true &&
      manifest.player_nodes_have_gameplay_authority === false &&
      manifest.region_servers_replaceable === true,
    "world manifest authority properties changed",
  );
  assertCondition(
    manifest.status === "source_only_requires_genesis_authorization",
    "world manifest status mismatch",
  );
  verifyFalseAuthorityBoundary(manifest.authority);
  const expected = `voidrw1_${await cidForJson(worldManifestBodyV1(manifest))}`;
  assertCondition(manifest.world_id === expected, "world content address mismatch");
}

export async function verifyVoidRealmsRegionDescriptorContentAddressV1(
  region: VoidRealmsRegionDescriptorV1,
  manifest: VoidRealmsWorldManifestV1,
): Promise<void> {
  assertExactKeys(region, "region descriptor", REGION_DESCRIPTOR_KEYS);
  assertCondition(
    region.marker === VOID_REALMS_REGION_DESCRIPTOR_MARKER,
    "region descriptor marker mismatch",
  );
  assertCondition(region.version === 1, "region descriptor version mismatch");
  requireString(region.region_id, "region_id", REGION_ID);
  assertCondition(region.world_id === manifest.world_id, "region world mismatch");
  assertCondition(region.space_id === manifest.space_id, "region space mismatch");
  const regionX = requireSafeInteger(
    region.region_x,
    "region_x",
    -2_000_000,
    2_000_000,
  );
  const regionZ = requireSafeInteger(
    region.region_z,
    "region_z",
    -2_000_000,
    2_000_000,
  );
  const minimumX = regionX * manifest.region_size_nodes;
  const minimumZ = regionZ * manifest.region_size_nodes;
  assertCondition(
    region.minimum_x === minimumX &&
      region.maximum_x === minimumX + manifest.region_size_nodes - 1 &&
      region.minimum_z === minimumZ &&
      region.maximum_z === minimumZ + manifest.region_size_nodes - 1 &&
      region.minimum_y === manifest.minimum_y &&
      region.maximum_y === manifest.maximum_y,
    "region descriptor bounds mismatch",
  );
  const expected = `voidrr1_${await cidForJson(regionDescriptorBodyV1(region))}`;
  assertCondition(region.region_id === expected, "region content address mismatch");
}

export async function verifyVoidRealmsRegionAuthorityLeaseContentAddressV1(
  lease: VoidRealmsRegionAuthorityLeaseV1,
): Promise<void> {
  assertExactKeys(lease, "authority lease", LEASE_KEYS);
  assertCondition(
    lease.marker === VOID_REALMS_REGION_AUTHORITY_LEASE_MARKER,
    "authority lease marker mismatch",
  );
  assertCondition(lease.version === 1, "authority lease version mismatch");
  requireString(lease.world_id, "lease world_id", WORLD_ID);
  requireString(lease.region_id, "lease region_id", REGION_ID);
  requireString(lease.authority_node_id, "authority node_id", NODE_ID);
  requireString(lease.lease_id, "lease_id", LEASE_ID);
  const generation = requireSafeInteger(lease.generation, "lease generation");
  if (generation === 0) {
    assertCondition(
      lease.previous_lease_id === null,
      "generation zero lease must not have a predecessor",
    );
  } else {
    requireString(lease.previous_lease_id, "previous lease_id", LEASE_ID);
  }
  const validFrom = requireUtc(lease.valid_from_utc, "lease valid_from_utc");
  const validUntil = requireUtc(lease.valid_until_utc, "lease valid_until_utc");
  assertCondition(
    Date.parse(validUntil) > Date.parse(validFrom),
    "lease validity window is not increasing",
  );
  assertCondition(lease.status === "planned_unsigned", "lease status mismatch");
  assertCondition(
    lease.signature_required_for_live_use === true &&
      lease.signature_present === false &&
      lease.gameplay_authority_activated === false,
    "source-only lease authority boundary changed",
  );
  const expected = `voidral1_${await cidForJson(leaseBodyV1(lease))}`;
  assertCondition(lease.lease_id === expected, "lease content address mismatch");
}

export async function verifyVoidRealmsRegionCheckpointContentAddressV1(
  checkpoint: VoidRealmsRegionCheckpointV1,
  authorityLease: VoidRealmsRegionAuthorityLeaseV1,
): Promise<void> {
  assertExactKeys(checkpoint, "region checkpoint", REGION_CHECKPOINT_KEYS);
  assertCondition(
    checkpoint.marker === VOID_REALMS_REGION_CHECKPOINT_MARKER,
    "region checkpoint marker mismatch",
  );
  assertCondition(checkpoint.version === 1, "region checkpoint version mismatch");
  requireString(checkpoint.checkpoint_id, "checkpoint_id", REGION_CHECKPOINT_ID);
  requireString(checkpoint.world_id, "checkpoint world_id", WORLD_ID);
  requireString(checkpoint.region_id, "checkpoint region_id", REGION_ID);
  requireString(checkpoint.authority_lease_id, "authority lease_id", LEASE_ID);
  const sequence = requireSafeInteger(checkpoint.sequence, "checkpoint sequence");
  requireSafeInteger(checkpoint.tick, "checkpoint tick");
  if (sequence === 0) {
    assertCondition(
      checkpoint.parent_checkpoint_id === null,
      "sequence zero checkpoint must not have a parent",
    );
  } else {
    requireString(
      checkpoint.parent_checkpoint_id,
      "parent checkpoint_id",
      REGION_CHECKPOINT_ID,
    );
  }
  requireString(checkpoint.state_root_sha256, "state root", HEX_64);
  requireString(
    checkpoint.public_object_manifest_root_sha256,
    "public object manifest root",
    HEX_64,
  );
  requireString(checkpoint.event_log_root_sha256, "event log root", HEX_64);
  const recordedAt = requireUtc(
    checkpoint.recorded_at_utc,
    "checkpoint recorded_at_utc",
  );
  assertCondition(
    checkpoint.status === "planned_unsigned",
    "region checkpoint status mismatch",
  );
  assertCondition(
    checkpoint.signature_required_for_live_use === true &&
      checkpoint.signature_present === false &&
      checkpoint.gameplay_state_committed === false,
    "source-only region checkpoint authority boundary changed",
  );
  assertCondition(
    checkpoint.authority_lease_id === authorityLease.lease_id &&
      checkpoint.world_id === authorityLease.world_id &&
      checkpoint.region_id === authorityLease.region_id,
    "region checkpoint lease binding mismatch",
  );
  assertCondition(
    Date.parse(recordedAt) >= Date.parse(authorityLease.valid_from_utc) &&
      Date.parse(recordedAt) <= Date.parse(authorityLease.valid_until_utc),
    "region checkpoint time is outside lease window",
  );
  const expected =
    `voidrcp1_${await cidForJson(regionCheckpointBodyV1(checkpoint))}`;
  assertCondition(
    checkpoint.checkpoint_id === expected,
    "region checkpoint content address mismatch",
  );
}

export async function verifyVoidRealmsWorldCheckpointContentAddressV1(
  checkpoint: VoidRealmsWorldCheckpointV1,
  terminalCheckpointIds: readonly string[],
): Promise<void> {
  assertExactKeys(checkpoint, "world checkpoint", WORLD_CHECKPOINT_KEYS);
  assertCondition(
    checkpoint.marker === VOID_REALMS_WORLD_CHECKPOINT_MARKER,
    "world checkpoint marker mismatch",
  );
  assertCondition(checkpoint.version === 1, "world checkpoint version mismatch");
  requireString(
    checkpoint.world_checkpoint_id,
    "world checkpoint_id",
    WORLD_CHECKPOINT_ID,
  );
  requireString(checkpoint.world_id, "world checkpoint world_id", WORLD_ID);
  const epoch = requireSafeInteger(checkpoint.epoch, "world checkpoint epoch");
  if (epoch === 0) {
    assertCondition(
      checkpoint.parent_world_checkpoint_id === null,
      "epoch zero world checkpoint must not have a parent",
    );
  } else {
    requireString(
      checkpoint.parent_world_checkpoint_id,
      "parent world checkpoint_id",
      WORLD_CHECKPOINT_ID,
    );
  }
  requireString(
    checkpoint.region_set_root_sha256,
    "world region set root",
    HEX_64,
  );
  requireUtc(checkpoint.recorded_at_utc, "world checkpoint recorded_at_utc");
  assertCondition(
    checkpoint.status === "planned_unsigned",
    "world checkpoint status mismatch",
  );
  assertCondition(
    checkpoint.signature_required_for_live_use === true &&
      checkpoint.signature_present === false &&
      checkpoint.canonical_world_state_committed === false,
    "source-only world checkpoint authority boundary changed",
  );

  const expectedIds = [...terminalCheckpointIds].sort(compareUtf16);
  const actualIds = [...checkpoint.region_checkpoint_ids];
  for (const checkpointId of actualIds) {
    requireString(
      checkpointId,
      "anchored region checkpoint_id",
      REGION_CHECKPOINT_ID,
    );
  }
  assertCondition(
    new Set(actualIds).size === actualIds.length,
    "world checkpoint contains duplicate region checkpoint IDs",
  );
  assertCondition(
    JSON.stringify(actualIds) ===
      JSON.stringify([...actualIds].sort(compareUtf16)),
    "world checkpoint region checkpoint IDs are not canonically sorted",
  );
  assertCondition(
    JSON.stringify(actualIds) === JSON.stringify(expectedIds),
    "world checkpoint terminal checkpoint set mismatch",
  );
  const expectedSetRoot = await cidForJson(expectedIds);
  assertCondition(
    checkpoint.region_set_root_sha256 === expectedSetRoot,
    "world checkpoint region set root mismatch",
  );
  const expectedWorldCheckpointId =
    `voidrwc1_${await cidForJson(worldCheckpointBodyV1(checkpoint))}`;
  assertCondition(
    checkpoint.world_checkpoint_id === expectedWorldCheckpointId,
    "world checkpoint content address mismatch",
  );
}

function findCheckpointById(
  graph: VoidRealmsCheckpointGraphV1,
  checkpointId: string,
): VoidRealmsRegionCheckpointV1 {
  const matches = graph.region_checkpoint_chains
    .flatMap((chain) => [...chain])
    .filter((checkpoint) => checkpoint.checkpoint_id === checkpointId);
  assertCondition(matches.length === 1, "checkpoint graph ID lookup is not unique");
  return matches[0];
}

export async function verifyVoidRealmsCheckpointGraphV1(
  graph: VoidRealmsCheckpointGraphV1,
): Promise<VoidRealmsCheckpointGraphVerificationV1> {
  assertExactKeys(graph, "checkpoint graph", GRAPH_KEYS);
  assertCondition(
    graph.marker === VOID_REALMS_CHECKPOINT_GRAPH_INTEGRITY_GUARD_MARKER,
    "checkpoint graph marker mismatch",
  );
  assertCondition(graph.version === 1, "checkpoint graph version mismatch");
  assertCondition(
    graph.authority_leases.length > 0,
    "checkpoint graph requires at least one authority lease",
  );
  assertCondition(
    graph.region_checkpoint_chains.length > 0,
    "checkpoint graph requires at least one region checkpoint chain",
  );

  const leaseById = new Map<string, VoidRealmsRegionAuthorityLeaseV1>();
  for (const lease of graph.authority_leases) {
    await verifyVoidRealmsRegionAuthorityLeaseContentAddressV1(lease);
    assertCondition(
      !leaseById.has(lease.lease_id),
      "duplicate authority lease ID",
    );
    leaseById.set(lease.lease_id, lease);
  }

  const usedLeaseIds = new Set<string>();
  const allCheckpointIds = new Set<string>();
  const terminalIds: string[] = [];
  const terminalRegionIds = new Set<string>();
  let graphWorldId: string | null = null;
  let latestTerminalTime = Number.NEGATIVE_INFINITY;

  for (const chain of graph.region_checkpoint_chains) {
    assertCondition(
      chain.length > 0,
      "region checkpoint chain must not be empty",
    );
    for (const checkpoint of chain) {
      const lease = leaseById.get(checkpoint.authority_lease_id);
      assertCondition(
        lease !== undefined,
        "checkpoint references an unknown authority lease",
      );
      await verifyVoidRealmsRegionCheckpointContentAddressV1(checkpoint, lease);
      assertCondition(
        !allCheckpointIds.has(checkpoint.checkpoint_id),
        "checkpoint graph contains a duplicate checkpoint ID",
      );
      allCheckpointIds.add(checkpoint.checkpoint_id);
      usedLeaseIds.add(lease.lease_id);
      if (graphWorldId === null) graphWorldId = checkpoint.world_id;
      assertCondition(
        checkpoint.world_id === graphWorldId,
        "checkpoint graph contains multiple world IDs",
      );
    }
    validateVoidRealmsRegionCheckpointChainV1(chain);
    const terminal = chain[chain.length - 1];
    assertCondition(
      !terminalRegionIds.has(terminal.region_id),
      "checkpoint graph contains duplicate region chains",
    );
    terminalRegionIds.add(terminal.region_id);
    terminalIds.push(terminal.checkpoint_id);
    latestTerminalTime = Math.max(
      latestTerminalTime,
      Date.parse(terminal.recorded_at_utc),
    );
  }

  assertCondition(graphWorldId !== null, "checkpoint graph world ID is missing");
  assertCondition(
    graph.world_checkpoint.world_id === graphWorldId,
    "world checkpoint belongs to another world",
  );
  assertCondition(
    Date.parse(graph.world_checkpoint.recorded_at_utc) >= latestTerminalTime,
    "world checkpoint predates a terminal region checkpoint",
  );
  await verifyVoidRealmsWorldCheckpointContentAddressV1(
    graph.world_checkpoint,
    terminalIds,
  );

  const providedLeaseIds = [...leaseById.keys()].sort(compareUtf16);
  const exactUsedLeaseIds = [...usedLeaseIds].sort(compareUtf16);
  assertCondition(
    JSON.stringify(providedLeaseIds) === JSON.stringify(exactUsedLeaseIds),
    "checkpoint graph contains an unreferenced authority lease",
  );

  return {
    marker: VOID_REALMS_CHECKPOINT_GRAPH_INTEGRITY_GUARD_MARKER,
    version: 1,
    verified: true,
    world_id: graphWorldId,
    world_checkpoint_id: graph.world_checkpoint.world_checkpoint_id,
    terminal_region_checkpoint_ids: [...terminalIds].sort(compareUtf16),
    authority_lease_ids: providedLeaseIds,
    gameplay_state_committed: false,
    checkpoint_signing_performed: false,
    handoff_accepted: false,
  };
}

function graphContainsTerminalCheckpoint(
  verification: VoidRealmsCheckpointGraphVerificationV1,
  checkpointId: string,
): boolean {
  return verification.terminal_region_checkpoint_ids.includes(checkpointId);
}

export async function verifyVoidRealmsPlayerRegionHandoffContentAddressV1(input: {
  handoff: VoidRealmsPlayerRegionHandoffV1;
  manifest: VoidRealmsWorldManifestV1;
  world_checkpoint: VoidRealmsWorldCheckpointV1;
  source_region: VoidRealmsRegionDescriptorV1;
  destination_region: VoidRealmsRegionDescriptorV1;
  source_checkpoint: VoidRealmsRegionCheckpointV1;
  destination_checkpoint: VoidRealmsRegionCheckpointV1;
}): Promise<void> {
  const {
    handoff,
    manifest,
    world_checkpoint: worldCheckpoint,
    source_region: sourceRegion,
    destination_region: destinationRegion,
    source_checkpoint: sourceCheckpoint,
    destination_checkpoint: destinationCheckpoint,
  } = input;

  await verifyVoidRealmsWorldManifestContentAddressV1(manifest);
  await verifyVoidRealmsRegionDescriptorContentAddressV1(sourceRegion, manifest);
  await verifyVoidRealmsRegionDescriptorContentAddressV1(
    destinationRegion,
    manifest,
  );
  assertExactKeys(handoff, "player region handoff", HANDOFF_KEYS);
  assertCondition(
    handoff.marker === VOID_REALMS_HANDOFF_MARKER,
    "handoff marker mismatch",
  );
  assertCondition(handoff.version === 1, "handoff version mismatch");
  requireString(handoff.handoff_id, "handoff_id", HANDOFF_ID);
  requireString(handoff.world_id, "handoff world_id", WORLD_ID);
  requireString(
    handoff.world_checkpoint_id,
    "handoff world checkpoint_id",
    WORLD_CHECKPOINT_ID,
  );
  requireString(handoff.player_session_id, "player session_id", SESSION_ID);
  requireString(handoff.source_region_id, "source region_id", REGION_ID);
  requireString(
    handoff.destination_region_id,
    "destination region_id",
    REGION_ID,
  );
  requireString(
    handoff.source_checkpoint_id,
    "source checkpoint_id",
    REGION_CHECKPOINT_ID,
  );
  requireString(
    handoff.destination_checkpoint_id,
    "destination checkpoint_id",
    REGION_CHECKPOINT_ID,
  );
  requireString(
    handoff.player_public_state_root_sha256,
    "player public state root",
    HEX_64,
  );
  requireString(handoff.handoff_nonce_hex, "handoff nonce", HEX_32);
  const notBefore = requireUtc(handoff.not_before_utc, "handoff not_before_utc");
  const expiresAt = requireUtc(handoff.expires_at_utc, "handoff expires_at_utc");
  const ttlMs = Date.parse(expiresAt) - Date.parse(notBefore);
  assertCondition(ttlMs > 0, "handoff expiry must follow not-before time");
  assertCondition(
    ttlMs <= manifest.handoff_ttl_seconds * 1000,
    "handoff TTL exceeds the verified world policy",
  );
  assertCondition(
    Date.parse(notBefore) >= Date.parse(worldCheckpoint.recorded_at_utc),
    "handoff starts before its world checkpoint",
  );
  assertCondition(
    handoff.status === "prepared_requires_destination_acceptance" &&
      handoff.raw_player_state_present === false &&
      handoff.destination_gameplay_state_committed === false,
    "handoff source-only authority boundary changed",
  );
  assertCondition(
    handoff.world_id === manifest.world_id &&
      handoff.world_id === worldCheckpoint.world_id &&
      handoff.world_checkpoint_id === worldCheckpoint.world_checkpoint_id,
    "handoff world binding mismatch",
  );
  assertCondition(
    sourceRegion.region_id !== destinationRegion.region_id &&
      regionsAreAdjacentV1(sourceRegion, destinationRegion),
    "handoff regions are not distinct orthogonal neighbors",
  );
  assertCondition(
    handoff.source_region_id === sourceRegion.region_id &&
      handoff.destination_region_id === destinationRegion.region_id,
    "handoff region binding mismatch",
  );
  assertCondition(
    sourceCheckpoint.world_id === handoff.world_id &&
      destinationCheckpoint.world_id === handoff.world_id &&
      sourceCheckpoint.region_id === handoff.source_region_id &&
      destinationCheckpoint.region_id === handoff.destination_region_id &&
      sourceCheckpoint.checkpoint_id === handoff.source_checkpoint_id &&
      destinationCheckpoint.checkpoint_id ===
        handoff.destination_checkpoint_id,
    "handoff checkpoint binding mismatch",
  );
  assertCondition(
    worldCheckpoint.region_checkpoint_ids.includes(
      handoff.source_checkpoint_id,
    ) &&
      worldCheckpoint.region_checkpoint_ids.includes(
        handoff.destination_checkpoint_id,
      ),
    "handoff checkpoints are not anchored in the world checkpoint",
  );
  const expected = `voidrho1_${await cidForJson(handoffBodyV1(handoff))}`;
  assertCondition(handoff.handoff_id === expected, "handoff content address mismatch");
}

export async function verifyVoidRealmsPlayerRegionHandoffReceiptContentAddressV1(
  receipt: VoidRealmsPlayerRegionHandoffReceiptV1,
  handoff: VoidRealmsPlayerRegionHandoffV1,
): Promise<void> {
  assertExactKeys(receipt, "handoff receipt", HANDOFF_RECEIPT_KEYS);
  assertCondition(
    receipt.marker === VOID_REALMS_HANDOFF_RECEIPT_MARKER,
    "handoff receipt marker mismatch",
  );
  assertCondition(receipt.version === 1, "handoff receipt version mismatch");
  requireString(receipt.receipt_id, "handoff receipt_id", HANDOFF_RECEIPT_ID);
  requireString(receipt.handoff_id, "receipt handoff_id", HANDOFF_ID);
  requireString(receipt.world_id, "receipt world_id", WORLD_ID);
  requireString(
    receipt.destination_region_id,
    "receipt destination region_id",
    REGION_ID,
  );
  requireString(
    receipt.destination_checkpoint_id,
    "receipt destination checkpoint_id",
    REGION_CHECKPOINT_ID,
  );
  const acceptedAt = requireUtc(
    receipt.accepted_at_utc,
    "receipt accepted_at_utc",
  );
  assertCondition(
    receipt.status === "accepted_requires_authoritative_state_commit" &&
      receipt.gameplay_state_committed === false,
    "handoff receipt authority boundary changed",
  );
  assertCondition(
    receipt.handoff_id === handoff.handoff_id &&
      receipt.world_id === handoff.world_id &&
      receipt.destination_region_id === handoff.destination_region_id &&
      receipt.destination_checkpoint_id === handoff.destination_checkpoint_id,
    "handoff receipt binding mismatch",
  );
  assertCondition(
    Date.parse(acceptedAt) >= Date.parse(handoff.not_before_utc) &&
      Date.parse(acceptedAt) <= Date.parse(handoff.expires_at_utc),
    "handoff receipt time is outside the handoff window",
  );
  const expected =
    `voidrhr1_${await cidForJson(handoffReceiptBodyV1(receipt))}`;
  assertCondition(
    receipt.receipt_id === expected,
    "handoff receipt content address mismatch",
  );
}

export async function planVoidRealmsPlayerRegionHandoffWithVerifiedCheckpointGraphV1(
  input: VoidRealmsVerifiedHandoffPlanInputV1,
): Promise<VoidRealmsPlayerRegionHandoffV1> {
  const { checkpoint_graph: checkpointGraph, ...handoffInput } = input;
  const verification = await verifyVoidRealmsCheckpointGraphV1(checkpointGraph);
  assertStableEqual(
    handoffInput.world_checkpoint,
    checkpointGraph.world_checkpoint,
    "handoff world checkpoint object differs from the verified graph",
  );
  const verifiedSourceCheckpoint = findCheckpointById(
    checkpointGraph,
    handoffInput.source_checkpoint.checkpoint_id,
  );
  const verifiedDestinationCheckpoint = findCheckpointById(
    checkpointGraph,
    handoffInput.destination_checkpoint.checkpoint_id,
  );
  assertStableEqual(
    handoffInput.source_checkpoint,
    verifiedSourceCheckpoint,
    "handoff source checkpoint object differs from the verified graph",
  );
  assertStableEqual(
    handoffInput.destination_checkpoint,
    verifiedDestinationCheckpoint,
    "handoff destination checkpoint object differs from the verified graph",
  );
  assertCondition(
    graphContainsTerminalCheckpoint(
      verification,
      handoffInput.source_checkpoint.checkpoint_id,
    ),
    "handoff source checkpoint is not a verified terminal checkpoint",
  );
  assertCondition(
    graphContainsTerminalCheckpoint(
      verification,
      handoffInput.destination_checkpoint.checkpoint_id,
    ),
    "handoff destination checkpoint is not a verified terminal checkpoint",
  );
  const handoff = await planVoidRealmsPlayerRegionHandoffV1(handoffInput);
  await verifyVoidRealmsPlayerRegionHandoffContentAddressV1({
    handoff,
    manifest: handoffInput.manifest,
    world_checkpoint: handoffInput.world_checkpoint,
    source_region: handoffInput.source_region,
    destination_region: handoffInput.destination_region,
    source_checkpoint: handoffInput.source_checkpoint,
    destination_checkpoint: handoffInput.destination_checkpoint,
  });
  return handoff;
}

export async function acceptVoidRealmsPlayerRegionHandoffWithVerifiedCheckpointGraphV1(
  input: VoidRealmsVerifiedHandoffAcceptanceInputV1,
): Promise<VoidRealmsPlayerRegionHandoffReceiptV1> {
  const {
    checkpoint_graph: checkpointGraph,
    manifest,
    source_region: sourceRegion,
    destination_region: destinationRegion,
    ...acceptanceInput
  } = input;
  const verification = await verifyVoidRealmsCheckpointGraphV1(checkpointGraph);
  assertStableEqual(
    acceptanceInput.world_checkpoint,
    checkpointGraph.world_checkpoint,
    "handoff acceptance world checkpoint differs from the verified graph",
  );
  const verifiedSourceCheckpoint = findCheckpointById(
    checkpointGraph,
    acceptanceInput.handoff.source_checkpoint_id,
  );
  const verifiedDestinationCheckpoint = findCheckpointById(
    checkpointGraph,
    acceptanceInput.handoff.destination_checkpoint_id,
  );
  assertStableEqual(
    acceptanceInput.destination_checkpoint,
    verifiedDestinationCheckpoint,
    "handoff acceptance destination checkpoint differs from the verified graph",
  );
  assertCondition(
    graphContainsTerminalCheckpoint(
      verification,
      verifiedSourceCheckpoint.checkpoint_id,
    ) &&
      graphContainsTerminalCheckpoint(
        verification,
        verifiedDestinationCheckpoint.checkpoint_id,
      ),
    "handoff acceptance checkpoints are not verified terminals",
  );
  await verifyVoidRealmsPlayerRegionHandoffContentAddressV1({
    handoff: acceptanceInput.handoff,
    manifest,
    world_checkpoint: acceptanceInput.world_checkpoint,
    source_region: sourceRegion,
    destination_region: destinationRegion,
    source_checkpoint: verifiedSourceCheckpoint,
    destination_checkpoint: verifiedDestinationCheckpoint,
  });
  const receipt = await acceptVoidRealmsPlayerRegionHandoffV1(acceptanceInput);
  await verifyVoidRealmsPlayerRegionHandoffReceiptContentAddressV1(
    receipt,
    acceptanceInput.handoff,
  );
  return receipt;
}
