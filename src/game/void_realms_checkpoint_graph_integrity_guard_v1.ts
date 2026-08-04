// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import { cidForJson } from "../util/cid.js";
import {
  VOID_REALMS_REGION_AUTHORITY_LEASE_MARKER,
  VOID_REALMS_REGION_CHECKPOINT_MARKER,
  VOID_REALMS_WORLD_CHECKPOINT_MARKER,
  acceptVoidRealmsPlayerRegionHandoffV1,
  planVoidRealmsPlayerRegionHandoffV1,
  validateVoidRealmsRegionCheckpointChainV1,
} from "./void_realms_single_canonical_world_region_checkpoint_handoff_v1.js";
import type {
  VoidRealmsPlayerRegionHandoffReceiptV1,
  VoidRealmsPlayerRegionHandoffV1,
  VoidRealmsRegionAuthorityLeaseV1,
  VoidRealmsRegionCheckpointV1,
  VoidRealmsWorldCheckpointV1,
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
  };

const HEX_64 = /^[0-9a-f]{64}$/;
const WORLD_ID = /^voidrw1_[0-9a-f]{64}$/;
const REGION_ID = /^voidrr1_[0-9a-f]{64}$/;
const NODE_ID = /^voidnode1_[0-9a-f]{64}$/;
const LEASE_ID = /^voidral1_[0-9a-f]{64}$/;
const REGION_CHECKPOINT_ID = /^voidrcp1_[0-9a-f]{64}$/;
const WORLD_CHECKPOINT_ID = /^voidrwc1_[0-9a-f]{64}$/;
const UTC =
  /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\dZ$/;

const GRAPH_KEYS = [
  "marker",
  "version",
  "world_checkpoint",
  "region_checkpoint_chains",
  "authority_leases",
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
  minimum = 0,
): number {
  assertCondition(
    Number.isSafeInteger(value) && (value as number) >= minimum,
    `${label} must be a safe integer >= ${minimum}`,
  );
  return value as number;
}

function requireUtc(value: unknown, label: string): string {
  const text = requireString(value, label, UTC);
  assertCondition(!Number.isNaN(Date.parse(text)), `${label} is invalid`);
  return text;
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

export async function planVoidRealmsPlayerRegionHandoffWithVerifiedCheckpointGraphV1(
  input: VoidRealmsVerifiedHandoffPlanInputV1,
): Promise<VoidRealmsPlayerRegionHandoffV1> {
  const { checkpoint_graph: checkpointGraph, ...handoffInput } = input;
  const verification = await verifyVoidRealmsCheckpointGraphV1(checkpointGraph);
  assertCondition(
    handoffInput.world_checkpoint.world_checkpoint_id ===
      verification.world_checkpoint_id,
    "handoff world checkpoint is not the verified graph checkpoint",
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
  return planVoidRealmsPlayerRegionHandoffV1(handoffInput);
}

export async function acceptVoidRealmsPlayerRegionHandoffWithVerifiedCheckpointGraphV1(
  input: VoidRealmsVerifiedHandoffAcceptanceInputV1,
): Promise<VoidRealmsPlayerRegionHandoffReceiptV1> {
  const { checkpoint_graph: checkpointGraph, ...acceptanceInput } = input;
  const verification = await verifyVoidRealmsCheckpointGraphV1(checkpointGraph);
  assertCondition(
    acceptanceInput.world_checkpoint.world_checkpoint_id ===
      verification.world_checkpoint_id,
    "handoff acceptance world checkpoint is not verified",
  );
  assertCondition(
    graphContainsTerminalCheckpoint(
      verification,
      acceptanceInput.destination_checkpoint.checkpoint_id,
    ),
    "handoff acceptance destination checkpoint is not verified",
  );
  return acceptVoidRealmsPlayerRegionHandoffV1(acceptanceInput);
}
