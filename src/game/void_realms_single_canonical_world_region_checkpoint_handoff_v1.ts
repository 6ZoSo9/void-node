// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import { cidForJson } from "../util/cid.js";

export const VOID_REALMS_SINGLE_WORLD_INPUT_MARKER =
  "VOID_REALMS_SINGLE_CANONICAL_WORLD_FOUNDATION_V1" as const;
export const VOID_REALMS_WORLD_MANIFEST_MARKER =
  "VOID_REALMS_CANONICAL_WORLD_MANIFEST_V1" as const;
export const VOID_REALMS_REGION_DESCRIPTOR_MARKER =
  "VOID_REALMS_REGION_DESCRIPTOR_V1" as const;
export const VOID_REALMS_REGION_AUTHORITY_LEASE_MARKER =
  "VOID_REALMS_REGION_AUTHORITY_LEASE_V1" as const;
export const VOID_REALMS_REGION_CHECKPOINT_MARKER =
  "VOID_REALMS_REGION_CHECKPOINT_V1" as const;
export const VOID_REALMS_WORLD_CHECKPOINT_MARKER =
  "VOID_REALMS_WORLD_CHECKPOINT_V1" as const;
export const VOID_REALMS_HANDOFF_MARKER =
  "VOID_REALMS_PLAYER_REGION_HANDOFF_V1" as const;
export const VOID_REALMS_HANDOFF_RECEIPT_MARKER =
  "VOID_REALMS_PLAYER_REGION_HANDOFF_RECEIPT_V1" as const;
export const VOID_REALMS_REPLICA_ADVERTISEMENT_MARKER =
  "VOID_REALMS_PLAYER_NODE_REPLICA_ADVERTISEMENT_V1" as const;

type JsonRecord = Record<string, unknown>;

export interface VoidRealmsSourceAuthorityBoundaryV1 {
  world_creation: false;
  region_assignment: false;
  checkpoint_signing: false;
  handoff_acceptance: false;
  gameplay_state_commit: false;
  network_listener_start: false;
  external_connection: false;
  server_start: false;
  deployment: false;
  work_credit_write: false;
  wallet_or_signer_access: false;
  payment_execution: false;
  money_movement: false;
}

export interface VoidRealmsSingleWorldInputV1 {
  marker: typeof VOID_REALMS_SINGLE_WORLD_INPUT_MARKER;
  version: 1;
  world_name: "VOID Realms";
  single_world_identity: true;
  space_id: "surface";
  genesis_seed_sha256: string;
  chunk_size_nodes: number;
  region_size_chunks: number;
  minimum_y: number;
  maximum_y: number;
  checkpoint_interval_ticks: number;
  handoff_ttl_seconds: number;
  player_nodes_may_serve_public_objects: true;
  player_nodes_have_gameplay_authority: false;
  region_servers_replaceable: true;
  authority: VoidRealmsSourceAuthorityBoundaryV1;
}

export interface VoidRealmsWorldManifestV1 {
  marker: typeof VOID_REALMS_WORLD_MANIFEST_MARKER;
  version: 1;
  world_id: string;
  world_name: "VOID Realms";
  single_world_identity: true;
  space_id: "surface";
  genesis_seed_sha256: string;
  chunk_size_nodes: number;
  region_size_chunks: number;
  region_size_nodes: number;
  minimum_y: number;
  maximum_y: number;
  checkpoint_interval_ticks: number;
  handoff_ttl_seconds: number;
  player_nodes_may_serve_public_objects: true;
  player_nodes_have_gameplay_authority: false;
  region_servers_replaceable: true;
  status: "source_only_requires_genesis_authorization";
  authority: VoidRealmsSourceAuthorityBoundaryV1;
}

export interface VoidRealmsRegionDescriptorV1 {
  marker: typeof VOID_REALMS_REGION_DESCRIPTOR_MARKER;
  version: 1;
  region_id: string;
  world_id: string;
  space_id: "surface";
  region_x: number;
  region_z: number;
  minimum_x: number;
  maximum_x: number;
  minimum_y: number;
  maximum_y: number;
  minimum_z: number;
  maximum_z: number;
}

export interface VoidRealmsRegionAuthorityLeaseV1 {
  marker: typeof VOID_REALMS_REGION_AUTHORITY_LEASE_MARKER;
  version: 1;
  lease_id: string;
  world_id: string;
  region_id: string;
  authority_node_id: string;
  generation: number;
  previous_lease_id: string | null;
  valid_from_utc: string;
  valid_until_utc: string;
  status: "planned_unsigned";
  signature_required_for_live_use: true;
  signature_present: false;
  gameplay_authority_activated: false;
}

export interface VoidRealmsRegionCheckpointV1 {
  marker: typeof VOID_REALMS_REGION_CHECKPOINT_MARKER;
  version: 1;
  checkpoint_id: string;
  world_id: string;
  region_id: string;
  authority_lease_id: string;
  sequence: number;
  tick: number;
  parent_checkpoint_id: string | null;
  state_root_sha256: string;
  public_object_manifest_root_sha256: string;
  event_log_root_sha256: string;
  recorded_at_utc: string;
  status: "planned_unsigned";
  signature_required_for_live_use: true;
  signature_present: false;
  gameplay_state_committed: false;
}

export interface VoidRealmsWorldCheckpointV1 {
  marker: typeof VOID_REALMS_WORLD_CHECKPOINT_MARKER;
  version: 1;
  world_checkpoint_id: string;
  world_id: string;
  epoch: number;
  parent_world_checkpoint_id: string | null;
  region_checkpoint_ids: string[];
  region_set_root_sha256: string;
  recorded_at_utc: string;
  status: "planned_unsigned";
  signature_required_for_live_use: true;
  signature_present: false;
  canonical_world_state_committed: false;
}

export interface VoidRealmsPlayerRegionHandoffV1 {
  marker: typeof VOID_REALMS_HANDOFF_MARKER;
  version: 1;
  handoff_id: string;
  world_id: string;
  world_checkpoint_id: string;
  player_session_id: string;
  source_region_id: string;
  destination_region_id: string;
  source_checkpoint_id: string;
  destination_checkpoint_id: string;
  player_public_state_root_sha256: string;
  handoff_nonce_hex: string;
  not_before_utc: string;
  expires_at_utc: string;
  status: "prepared_requires_destination_acceptance";
  raw_player_state_present: false;
  destination_gameplay_state_committed: false;
}

export interface VoidRealmsPlayerRegionHandoffReceiptV1 {
  marker: typeof VOID_REALMS_HANDOFF_RECEIPT_MARKER;
  version: 1;
  receipt_id: string;
  handoff_id: string;
  world_id: string;
  destination_region_id: string;
  destination_checkpoint_id: string;
  accepted_at_utc: string;
  status: "accepted_requires_authoritative_state_commit";
  gameplay_state_committed: false;
}

export interface VoidRealmsPlayerNodeReplicaAdvertisementV1 {
  marker: typeof VOID_REALMS_REPLICA_ADVERTISEMENT_MARKER;
  version: 1;
  advertisement_id: string;
  world_id: string;
  node_id: string;
  region_checkpoint_id: string;
  public_object_roots_sha256: string[];
  available_bytes: number;
  recorded_at_utc: string;
  status: "public_replica_available";
  gameplay_authority: false;
  checkpoint_signing_authority: false;
  handoff_acceptance_authority: false;
}

const HEX_64 = /^[0-9a-f]{64}$/;
const HEX_32 = /^[0-9a-f]{32}$/;
const UTC =
  /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\dZ$/;
const WORLD_ID = /^voidrw1_[0-9a-f]{64}$/;
const REGION_ID = /^voidrr1_[0-9a-f]{64}$/;
const LEASE_ID = /^voidral1_[0-9a-f]{64}$/;
const REGION_CHECKPOINT_ID = /^voidrcp1_[0-9a-f]{64}$/;
const WORLD_CHECKPOINT_ID = /^voidrwc1_[0-9a-f]{64}$/;
const SESSION_ID = /^voidrps1_[0-9a-f]{64}$/;
const NODE_ID = /^voidnode1_[0-9a-f]{64}$/;

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function requireRecord(value: unknown, label: string): JsonRecord {
  assertCondition(
    value !== null && typeof value === "object" && !Array.isArray(value),
    `${label} must be an object`,
  );
  return value as JsonRecord;
}

function exactKeys(
  value: JsonRecord,
  label: string,
  expected: readonly string[],
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  assertCondition(
    JSON.stringify(actual) === JSON.stringify(wanted),
    `${label} must contain exactly: ${wanted.join(", ")}`,
  );
}

function requireString(
  value: unknown,
  label: string,
  pattern?: RegExp,
): string {
  assertCondition(
    typeof value === "string" &&
      value.length > 0 &&
      value === value.trim(),
    `${label} must be a non-empty trimmed string`,
  );
  if (pattern) {
    assertCondition(pattern.test(value), `${label} has invalid format`);
  }
  return value;
}

function requireInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number {
  assertCondition(
    Number.isInteger(value) &&
      (value as number) >= minimum &&
      (value as number) <= maximum,
    `${label} must be an integer in ${minimum}..${maximum}`,
  );
  return value as number;
}

function requireUtc(value: unknown, label: string): string {
  const text = requireString(value, label, UTC);
  assertCondition(!Number.isNaN(Date.parse(text)), `${label} is not a valid UTC time`);
  return text;
}

function requireFalseBoundary(
  value: unknown,
): VoidRealmsSourceAuthorityBoundaryV1 {
  const record = requireRecord(value, "authority");
  const keys = [
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
  exactKeys(record, "authority", keys);
  for (const key of keys) {
    assertCondition(record[key] === false, `authority.${key} must be false`);
  }
  return record as unknown as VoidRealmsSourceAuthorityBoundaryV1;
}

export function validateVoidRealmsSingleWorldInputV1(
  value: unknown,
): VoidRealmsSingleWorldInputV1 {
  const record = requireRecord(value, "input");
  exactKeys(record, "input", [
    "marker",
    "version",
    "world_name",
    "single_world_identity",
    "space_id",
    "genesis_seed_sha256",
    "chunk_size_nodes",
    "region_size_chunks",
    "minimum_y",
    "maximum_y",
    "checkpoint_interval_ticks",
    "handoff_ttl_seconds",
    "player_nodes_may_serve_public_objects",
    "player_nodes_have_gameplay_authority",
    "region_servers_replaceable",
    "authority",
  ]);

  assertCondition(
    record.marker === VOID_REALMS_SINGLE_WORLD_INPUT_MARKER,
    "input marker mismatch",
  );
  assertCondition(record.version === 1, "input version mismatch");
  assertCondition(record.world_name === "VOID Realms", "world name mismatch");
  assertCondition(
    record.single_world_identity === true,
    "single world identity must remain true",
  );
  assertCondition(record.space_id === "surface", "space ID mismatch");
  const genesis = requireString(
    record.genesis_seed_sha256,
    "genesis_seed_sha256",
    HEX_64,
  );
  const chunkSize = requireInteger(
    record.chunk_size_nodes,
    "chunk_size_nodes",
    16,
    64,
  );
  const regionChunks = requireInteger(
    record.region_size_chunks,
    "region_size_chunks",
    16,
    256,
  );
  const minimumY = requireInteger(record.minimum_y, "minimum_y", -4096, 0);
  const maximumY = requireInteger(record.maximum_y, "maximum_y", 1, 4096);
  assertCondition(maximumY > minimumY, "maximum_y must exceed minimum_y");
  const checkpointInterval = requireInteger(
    record.checkpoint_interval_ticks,
    "checkpoint_interval_ticks",
    60,
    72000,
  );
  const handoffTtl = requireInteger(
    record.handoff_ttl_seconds,
    "handoff_ttl_seconds",
    5,
    120,
  );
  assertCondition(
    record.player_nodes_may_serve_public_objects === true,
    "player object serving must remain enabled",
  );
  assertCondition(
    record.player_nodes_have_gameplay_authority === false,
    "player nodes must not gain gameplay authority",
  );
  assertCondition(
    record.region_servers_replaceable === true,
    "region servers must remain replaceable",
  );

  return {
    marker: VOID_REALMS_SINGLE_WORLD_INPUT_MARKER,
    version: 1 as const,
    world_name: "VOID Realms",
    single_world_identity: true,
    space_id: "surface",
    genesis_seed_sha256: genesis,
    chunk_size_nodes: chunkSize,
    region_size_chunks: regionChunks,
    minimum_y: minimumY,
    maximum_y: maximumY,
    checkpoint_interval_ticks: checkpointInterval,
    handoff_ttl_seconds: handoffTtl,
    player_nodes_may_serve_public_objects: true,
    player_nodes_have_gameplay_authority: false,
    region_servers_replaceable: true,
    authority: requireFalseBoundary(record.authority),
  };
}

export async function materializeVoidRealmsWorldManifestV1(
  value: unknown,
): Promise<VoidRealmsWorldManifestV1> {
  const input = validateVoidRealmsSingleWorldInputV1(value);
  const body = {
    marker: VOID_REALMS_WORLD_MANIFEST_MARKER,
    version: 1 as const,
    world_name: input.world_name,
    single_world_identity: input.single_world_identity,
    space_id: input.space_id,
    genesis_seed_sha256: input.genesis_seed_sha256,
    chunk_size_nodes: input.chunk_size_nodes,
    region_size_chunks: input.region_size_chunks,
    region_size_nodes: input.chunk_size_nodes * input.region_size_chunks,
    minimum_y: input.minimum_y,
    maximum_y: input.maximum_y,
    checkpoint_interval_ticks: input.checkpoint_interval_ticks,
    handoff_ttl_seconds: input.handoff_ttl_seconds,
    player_nodes_may_serve_public_objects:
      input.player_nodes_may_serve_public_objects,
    player_nodes_have_gameplay_authority:
      input.player_nodes_have_gameplay_authority,
    region_servers_replaceable: input.region_servers_replaceable,
    status: "source_only_requires_genesis_authorization" as const,
    authority: input.authority,
  };
  return {
    ...body,
    world_id: `voidrw1_${await cidForJson(body)}`,
  };
}

export function regionCoordinatesForPositionV1(
  manifest: VoidRealmsWorldManifestV1,
  x: number,
  z: number,
): { region_x: number; region_z: number } {
  assertCondition(Number.isSafeInteger(x), "x must be a safe integer");
  assertCondition(Number.isSafeInteger(z), "z must be a safe integer");
  return {
    region_x: Math.floor(x / manifest.region_size_nodes),
    region_z: Math.floor(z / manifest.region_size_nodes),
  };
}

export async function materializeVoidRealmsRegionDescriptorV1(
  manifest: VoidRealmsWorldManifestV1,
  regionX: number,
  regionZ: number,
): Promise<VoidRealmsRegionDescriptorV1> {
  assertCondition(WORLD_ID.test(manifest.world_id), "world ID mismatch");
  requireInteger(regionX, "region_x", -2_000_000, 2_000_000);
  requireInteger(regionZ, "region_z", -2_000_000, 2_000_000);
  const minimumX = regionX * manifest.region_size_nodes;
  const minimumZ = regionZ * manifest.region_size_nodes;
  const body = {
    marker: VOID_REALMS_REGION_DESCRIPTOR_MARKER,
    version: 1 as const,
    world_id: manifest.world_id,
    space_id: manifest.space_id,
    region_x: regionX,
    region_z: regionZ,
    minimum_x: minimumX,
    maximum_x: minimumX + manifest.region_size_nodes - 1,
    minimum_y: manifest.minimum_y,
    maximum_y: manifest.maximum_y,
    minimum_z: minimumZ,
    maximum_z: minimumZ + manifest.region_size_nodes - 1,
  };
  return {
    ...body,
    region_id: `voidrr1_${await cidForJson(body)}`,
  };
}

export function positionBelongsToRegionV1(
  region: VoidRealmsRegionDescriptorV1,
  x: number,
  y: number,
  z: number,
): boolean {
  return (
    Number.isSafeInteger(x) &&
    Number.isSafeInteger(y) &&
    Number.isSafeInteger(z) &&
    x >= region.minimum_x &&
    x <= region.maximum_x &&
    y >= region.minimum_y &&
    y <= region.maximum_y &&
    z >= region.minimum_z &&
    z <= region.maximum_z
  );
}

export function regionsAreAdjacentV1(
  source: VoidRealmsRegionDescriptorV1,
  destination: VoidRealmsRegionDescriptorV1,
): boolean {
  if (
    source.world_id !== destination.world_id ||
    source.space_id !== destination.space_id
  ) {
    return false;
  }
  const dx = Math.abs(source.region_x - destination.region_x);
  const dz = Math.abs(source.region_z - destination.region_z);
  return dx + dz === 1;
}

export async function materializeVoidRealmsRegionAuthorityLeaseV1(input: {
  world_id: string;
  region_id: string;
  authority_node_id: string;
  generation: number;
  previous_lease_id: string | null;
  valid_from_utc: string;
  valid_until_utc: string;
}): Promise<VoidRealmsRegionAuthorityLeaseV1> {
  requireString(input.world_id, "world_id", WORLD_ID);
  requireString(input.region_id, "region_id", REGION_ID);
  requireString(input.authority_node_id, "authority_node_id", NODE_ID);
  requireInteger(input.generation, "generation", 0, Number.MAX_SAFE_INTEGER);
  if (input.generation === 0) {
    assertCondition(
      input.previous_lease_id === null,
      "generation zero must not have a previous lease",
    );
  } else {
    requireString(input.previous_lease_id, "previous_lease_id", LEASE_ID);
  }
  const validFrom = requireUtc(input.valid_from_utc, "valid_from_utc");
  const validUntil = requireUtc(input.valid_until_utc, "valid_until_utc");
  assertCondition(
    Date.parse(validUntil) > Date.parse(validFrom),
    "lease end must follow lease start",
  );
  const body = {
    marker: VOID_REALMS_REGION_AUTHORITY_LEASE_MARKER,
    version: 1 as const,
    world_id: input.world_id,
    region_id: input.region_id,
    authority_node_id: input.authority_node_id,
    generation: input.generation,
    previous_lease_id: input.previous_lease_id,
    valid_from_utc: validFrom,
    valid_until_utc: validUntil,
    status: "planned_unsigned" as const,
    signature_required_for_live_use: true as const,
    signature_present: false as const,
    gameplay_authority_activated: false as const,
  };
  return {
    ...body,
    lease_id: `voidral1_${await cidForJson(body)}`,
  };
}

export async function materializeVoidRealmsRegionCheckpointV1(input: {
  world_id: string;
  region_id: string;
  authority_lease: VoidRealmsRegionAuthorityLeaseV1;
  sequence: number;
  tick: number;
  parent_checkpoint_id: string | null;
  state_root_sha256: string;
  public_object_manifest_root_sha256: string;
  event_log_root_sha256: string;
  recorded_at_utc: string;
}): Promise<VoidRealmsRegionCheckpointV1> {
  requireString(input.world_id, "world_id", WORLD_ID);
  requireString(input.region_id, "region_id", REGION_ID);
  assertCondition(
    input.authority_lease.world_id === input.world_id,
    "lease world binding mismatch",
  );
  assertCondition(
    input.authority_lease.region_id === input.region_id,
    "lease region binding mismatch",
  );
  assertCondition(
    input.authority_lease.signature_present === false &&
      input.authority_lease.gameplay_authority_activated === false,
    "source-only lease unexpectedly grants authority",
  );
  const sequence = requireInteger(
    input.sequence,
    "sequence",
    0,
    Number.MAX_SAFE_INTEGER,
  );
  const tick = requireInteger(input.tick, "tick", 0, Number.MAX_SAFE_INTEGER);
  if (sequence === 0) {
    assertCondition(
      input.parent_checkpoint_id === null,
      "sequence zero must not have a parent checkpoint",
    );
  } else {
    requireString(
      input.parent_checkpoint_id,
      "parent_checkpoint_id",
      REGION_CHECKPOINT_ID,
    );
  }
  const recordedAt = requireUtc(input.recorded_at_utc, "recorded_at_utc");
  assertCondition(
    Date.parse(recordedAt) >= Date.parse(input.authority_lease.valid_from_utc) &&
      Date.parse(recordedAt) <= Date.parse(input.authority_lease.valid_until_utc),
    "checkpoint time is outside the authority lease window",
  );
  const body = {
    marker: VOID_REALMS_REGION_CHECKPOINT_MARKER,
    version: 1 as const,
    world_id: input.world_id,
    region_id: input.region_id,
    authority_lease_id: input.authority_lease.lease_id,
    sequence,
    tick,
    parent_checkpoint_id: input.parent_checkpoint_id,
    state_root_sha256: requireString(
      input.state_root_sha256,
      "state_root_sha256",
      HEX_64,
    ),
    public_object_manifest_root_sha256: requireString(
      input.public_object_manifest_root_sha256,
      "public_object_manifest_root_sha256",
      HEX_64,
    ),
    event_log_root_sha256: requireString(
      input.event_log_root_sha256,
      "event_log_root_sha256",
      HEX_64,
    ),
    recorded_at_utc: recordedAt,
    status: "planned_unsigned" as const,
    signature_required_for_live_use: true as const,
    signature_present: false as const,
    gameplay_state_committed: false as const,
  };
  return {
    ...body,
    checkpoint_id: `voidrcp1_${await cidForJson(body)}`,
  };
}

export function validateVoidRealmsRegionCheckpointChainV1(
  checkpoints: readonly VoidRealmsRegionCheckpointV1[],
): void {
  assertCondition(checkpoints.length > 0, "checkpoint chain must not be empty");
  for (let index = 0; index < checkpoints.length; index += 1) {
    const checkpoint = checkpoints[index];
    requireString(checkpoint.checkpoint_id, "checkpoint_id", REGION_CHECKPOINT_ID);
    assertCondition(
      checkpoint.sequence === index,
      "checkpoint sequence must be contiguous from zero",
    );
    if (index === 0) {
      assertCondition(
        checkpoint.parent_checkpoint_id === null,
        "first checkpoint must have no parent",
      );
    } else {
      const previous = checkpoints[index - 1];
      assertCondition(
        checkpoint.world_id === previous.world_id &&
          checkpoint.region_id === previous.region_id,
        "checkpoint chain changed world or region",
      );
      assertCondition(
        checkpoint.parent_checkpoint_id === previous.checkpoint_id,
        "checkpoint parent mismatch",
      );
      assertCondition(
        checkpoint.tick > previous.tick,
        "checkpoint tick must increase",
      );
      assertCondition(
        Date.parse(checkpoint.recorded_at_utc) >
          Date.parse(previous.recorded_at_utc),
        "checkpoint time must increase",
      );
    }
  }
}

export async function materializeVoidRealmsWorldCheckpointV1(input: {
  world_id: string;
  epoch: number;
  parent_world_checkpoint_id: string | null;
  region_checkpoints: readonly VoidRealmsRegionCheckpointV1[];
  recorded_at_utc: string;
}): Promise<VoidRealmsWorldCheckpointV1> {
  requireString(input.world_id, "world_id", WORLD_ID);
  const epoch = requireInteger(input.epoch, "epoch", 0, Number.MAX_SAFE_INTEGER);
  if (epoch === 0) {
    assertCondition(
      input.parent_world_checkpoint_id === null,
      "epoch zero must not have a parent world checkpoint",
    );
  } else {
    requireString(
      input.parent_world_checkpoint_id,
      "parent_world_checkpoint_id",
      WORLD_CHECKPOINT_ID,
    );
  }
  assertCondition(
    input.region_checkpoints.length > 0,
    "world checkpoint requires at least one region checkpoint",
  );
  const regionIds = new Set<string>();
  const checkpointIds: string[] = [];
  for (const checkpoint of input.region_checkpoints) {
    assertCondition(
      checkpoint.world_id === input.world_id,
      "region checkpoint belongs to another world",
    );
    assertCondition(
      checkpoint.signature_present === false &&
        checkpoint.gameplay_state_committed === false,
      "source-only region checkpoint unexpectedly committed state",
    );
    assertCondition(
      !regionIds.has(checkpoint.region_id),
      "world checkpoint contains duplicate region entries",
    );
    regionIds.add(checkpoint.region_id);
    checkpointIds.push(checkpoint.checkpoint_id);
  }
  checkpointIds.sort();
  const recordedAt = requireUtc(input.recorded_at_utc, "recorded_at_utc");
  const body = {
    marker: VOID_REALMS_WORLD_CHECKPOINT_MARKER,
    version: 1 as const,
    world_id: input.world_id,
    epoch,
    parent_world_checkpoint_id: input.parent_world_checkpoint_id,
    region_checkpoint_ids: checkpointIds,
    region_set_root_sha256: await cidForJson(checkpointIds),
    recorded_at_utc: recordedAt,
    status: "planned_unsigned" as const,
    signature_required_for_live_use: true as const,
    signature_present: false as const,
    canonical_world_state_committed: false as const,
  };
  return {
    ...body,
    world_checkpoint_id: `voidrwc1_${await cidForJson(body)}`,
  };
}

export async function planVoidRealmsPlayerRegionHandoffV1(input: {
  manifest: VoidRealmsWorldManifestV1;
  world_checkpoint: VoidRealmsWorldCheckpointV1;
  player_session_id: string;
  source_region: VoidRealmsRegionDescriptorV1;
  destination_region: VoidRealmsRegionDescriptorV1;
  source_checkpoint: VoidRealmsRegionCheckpointV1;
  destination_checkpoint: VoidRealmsRegionCheckpointV1;
  source_position: { x: number; y: number; z: number };
  destination_position: { x: number; y: number; z: number };
  player_public_state_root_sha256: string;
  handoff_nonce_hex: string;
  not_before_utc: string;
  expires_at_utc: string;
}): Promise<VoidRealmsPlayerRegionHandoffV1> {
  const worldId = input.manifest.world_id;
  assertCondition(
    input.world_checkpoint.world_id === worldId,
    "world checkpoint binding mismatch",
  );
  assertCondition(
    input.source_region.world_id === worldId &&
      input.destination_region.world_id === worldId,
    "region belongs to another world",
  );
  assertCondition(
    regionsAreAdjacentV1(input.source_region, input.destination_region),
    "handoff regions must be orthogonally adjacent",
  );
  assertCondition(
    input.source_checkpoint.world_id === worldId &&
      input.destination_checkpoint.world_id === worldId,
    "checkpoint belongs to another world",
  );
  assertCondition(
    input.source_checkpoint.region_id === input.source_region.region_id &&
      input.destination_checkpoint.region_id ===
        input.destination_region.region_id,
    "checkpoint region binding mismatch",
  );
  assertCondition(
    input.world_checkpoint.region_checkpoint_ids.includes(
      input.source_checkpoint.checkpoint_id,
    ) &&
      input.world_checkpoint.region_checkpoint_ids.includes(
        input.destination_checkpoint.checkpoint_id,
      ),
    "handoff checkpoints are not anchored in the world checkpoint",
  );
  assertCondition(
    positionBelongsToRegionV1(
      input.source_region,
      input.source_position.x,
      input.source_position.y,
      input.source_position.z,
    ),
    "source position is outside the source region",
  );
  assertCondition(
    positionBelongsToRegionV1(
      input.destination_region,
      input.destination_position.x,
      input.destination_position.y,
      input.destination_position.z,
    ),
    "destination position is outside the destination region",
  );
  requireString(input.player_session_id, "player_session_id", SESSION_ID);
  requireString(
    input.player_public_state_root_sha256,
    "player_public_state_root_sha256",
    HEX_64,
  );
  requireString(input.handoff_nonce_hex, "handoff_nonce_hex", HEX_32);
  const notBefore = requireUtc(input.not_before_utc, "not_before_utc");
  const expiresAt = requireUtc(input.expires_at_utc, "expires_at_utc");
  const ttlMs = Date.parse(expiresAt) - Date.parse(notBefore);
  assertCondition(ttlMs > 0, "handoff expiry must follow not-before time");
  assertCondition(
    ttlMs <= input.manifest.handoff_ttl_seconds * 1000,
    "handoff TTL exceeds the world policy",
  );
  const body = {
    marker: VOID_REALMS_HANDOFF_MARKER,
    version: 1 as const,
    world_id: worldId,
    world_checkpoint_id: input.world_checkpoint.world_checkpoint_id,
    player_session_id: input.player_session_id,
    source_region_id: input.source_region.region_id,
    destination_region_id: input.destination_region.region_id,
    source_checkpoint_id: input.source_checkpoint.checkpoint_id,
    destination_checkpoint_id: input.destination_checkpoint.checkpoint_id,
    player_public_state_root_sha256:
      input.player_public_state_root_sha256,
    handoff_nonce_hex: input.handoff_nonce_hex,
    not_before_utc: notBefore,
    expires_at_utc: expiresAt,
    status: "prepared_requires_destination_acceptance" as const,
    raw_player_state_present: false as const,
    destination_gameplay_state_committed: false as const,
  };
  return {
    ...body,
    handoff_id: `voidrho1_${await cidForJson(body)}`,
  };
}

export async function acceptVoidRealmsPlayerRegionHandoffV1(input: {
  handoff: VoidRealmsPlayerRegionHandoffV1;
  world_checkpoint: VoidRealmsWorldCheckpointV1;
  destination_checkpoint: VoidRealmsRegionCheckpointV1;
  accepted_at_utc: string;
}): Promise<VoidRealmsPlayerRegionHandoffReceiptV1> {
  assertCondition(
    input.handoff.world_checkpoint_id ===
      input.world_checkpoint.world_checkpoint_id,
    "handoff world checkpoint mismatch",
  );
  assertCondition(
    input.handoff.world_id === input.world_checkpoint.world_id,
    "handoff world mismatch",
  );
  assertCondition(
    input.handoff.destination_checkpoint_id ===
      input.destination_checkpoint.checkpoint_id,
    "destination checkpoint mismatch",
  );
  assertCondition(
    input.handoff.destination_region_id ===
      input.destination_checkpoint.region_id,
    "destination region mismatch",
  );
  const acceptedAt = requireUtc(input.accepted_at_utc, "accepted_at_utc");
  assertCondition(
    Date.parse(acceptedAt) >= Date.parse(input.handoff.not_before_utc) &&
      Date.parse(acceptedAt) <= Date.parse(input.handoff.expires_at_utc),
    "handoff acceptance is outside the valid window",
  );
  const body = {
    marker: VOID_REALMS_HANDOFF_RECEIPT_MARKER,
    version: 1 as const,
    handoff_id: input.handoff.handoff_id,
    world_id: input.handoff.world_id,
    destination_region_id: input.handoff.destination_region_id,
    destination_checkpoint_id:
      input.handoff.destination_checkpoint_id,
    accepted_at_utc: acceptedAt,
    status: "accepted_requires_authoritative_state_commit" as const,
    gameplay_state_committed: false as const,
  };
  return {
    ...body,
    receipt_id: `voidrhr1_${await cidForJson(body)}`,
  };
}

export async function materializeVoidRealmsReplicaAdvertisementV1(input: {
  world_id: string;
  node_id: string;
  region_checkpoint_id: string;
  public_object_roots_sha256: readonly string[];
  available_bytes: number;
  recorded_at_utc: string;
}): Promise<VoidRealmsPlayerNodeReplicaAdvertisementV1> {
  requireString(input.world_id, "world_id", WORLD_ID);
  requireString(input.node_id, "node_id", NODE_ID);
  requireString(
    input.region_checkpoint_id,
    "region_checkpoint_id",
    REGION_CHECKPOINT_ID,
  );
  assertCondition(
    input.public_object_roots_sha256.length > 0 &&
      input.public_object_roots_sha256.length <= 4096,
    "replica advertisement requires 1..4096 object roots",
  );
  const roots = [...input.public_object_roots_sha256];
  for (const root of roots) {
    requireString(root, "public_object_root_sha256", HEX_64);
  }
  roots.sort();
  assertCondition(
    new Set(roots).size === roots.length,
    "replica advertisement contains duplicate roots",
  );
  const availableBytes = requireInteger(
    input.available_bytes,
    "available_bytes",
    0,
    Number.MAX_SAFE_INTEGER,
  );
  const recordedAt = requireUtc(input.recorded_at_utc, "recorded_at_utc");
  const body = {
    marker: VOID_REALMS_REPLICA_ADVERTISEMENT_MARKER,
    version: 1 as const,
    world_id: input.world_id,
    node_id: input.node_id,
    region_checkpoint_id: input.region_checkpoint_id,
    public_object_roots_sha256: roots,
    available_bytes: availableBytes,
    recorded_at_utc: recordedAt,
    status: "public_replica_available" as const,
    gameplay_authority: false as const,
    checkpoint_signing_authority: false as const,
    handoff_acceptance_authority: false as const,
  };
  return {
    ...body,
    advertisement_id: `voidrra1_${await cidForJson(body)}`,
  };
}
