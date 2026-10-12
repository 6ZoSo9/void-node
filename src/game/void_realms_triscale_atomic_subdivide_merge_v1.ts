// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import { cidForJson } from "../util/cid.js";
import type {
  VoidRealmsRegionDescriptorV1,
  VoidRealmsWorldManifestV1,
} from "./void_realms_single_canonical_world_region_checkpoint_handoff_v1.js";
import {
  enumeratePlacementMicrocellKeysV1,
  materializeVoidRealmsTriScaleBuildStateV1,
  occupancyRootForPlacementsV1,
  placementFitsRegionV1,
  placementOriginIsAlignedV1,
  voidRealmsScaleProfileByNameV1,
  type VoidRealmsBuildScaleV1,
  type VoidRealmsMicrocellPositionV1,
  type VoidRealmsTriScaleBuildStateV1,
  type VoidRealmsTriScalePlacementV1,
} from "./void_realms_triscale_building_v1.js";

export const VOID_REALMS_TRISCALE_SUBDIVIDE_REQUEST_MARKER =
  "VOID_REALMS_TRISCALE_SUBDIVIDE_REQUEST_V1" as const;
export const VOID_REALMS_TRISCALE_SUBDIVIDE_PLAN_MARKER =
  "VOID_REALMS_TRISCALE_SUBDIVIDE_PLAN_V1" as const;
export const VOID_REALMS_TRISCALE_MERGE_REQUEST_MARKER =
  "VOID_REALMS_TRISCALE_MERGE_REQUEST_V1" as const;
export const VOID_REALMS_TRISCALE_MERGE_PLAN_MARKER =
  "VOID_REALMS_TRISCALE_MERGE_PLAN_V1" as const;
export const VOID_REALMS_TRISCALE_ATOMIC_CONVERSION_RECEIPT_MARKER =
  "VOID_REALMS_TRISCALE_ATOMIC_CONVERSION_SIMULATION_RECEIPT_V1" as const;

export interface VoidRealmsTriScaleSubdivideRequestV1 {
  marker: typeof VOID_REALMS_TRISCALE_SUBDIVIDE_REQUEST_MARKER;
  version: 1;
  world_id: string;
  region_id: string;
  player_session_id: string;
  source_placement_id: string;
  target_scale: VoidRealmsBuildScaleV1;
  expected_revision: number;
  request_nonce_hex: string;
  requested_at_utc: string;
}

export interface VoidRealmsTriScaleSubdividePlanV1 {
  marker: typeof VOID_REALMS_TRISCALE_SUBDIVIDE_PLAN_MARKER;
  version: 1;
  request_id: string;
  status: "planned_requires_authoritative_commit";
  world_id: string;
  region_id: string;
  expected_revision: number;
  next_revision: number;
  source_placement: VoidRealmsTriScalePlacementV1;
  target_scale: VoidRealmsBuildScaleV1;
  replacement_placements: VoidRealmsTriScalePlacementV1[];
  replacement_count: number;
  occupied_microcell_keys: string[];
  occupancy_root_before: string;
  occupancy_root_after: string;
  material_units_before: number;
  material_units_after: number;
  material_units_delta: 0;
  atomic_replacement_required: true;
  transient_overlap_allowed: false;
  gameplay_state_committed: false;
}

export interface VoidRealmsTriScaleMergeRequestV1 {
  marker: typeof VOID_REALMS_TRISCALE_MERGE_REQUEST_MARKER;
  version: 1;
  world_id: string;
  region_id: string;
  player_session_id: string;
  source_placement_ids: string[];
  target_scale: VoidRealmsBuildScaleV1;
  target_origin_microcell: VoidRealmsMicrocellPositionV1;
  expected_revision: number;
  request_nonce_hex: string;
  requested_at_utc: string;
}

export interface VoidRealmsTriScaleMergePlanV1 {
  marker: typeof VOID_REALMS_TRISCALE_MERGE_PLAN_MARKER;
  version: 1;
  request_id: string;
  status: "planned_requires_authoritative_commit";
  world_id: string;
  region_id: string;
  expected_revision: number;
  next_revision: number;
  source_scale: VoidRealmsBuildScaleV1;
  source_placements: VoidRealmsTriScalePlacementV1[];
  source_count: number;
  target_placement: VoidRealmsTriScalePlacementV1;
  occupied_microcell_keys: string[];
  occupancy_root_before: string;
  occupancy_root_after: string;
  material_units_before: number;
  material_units_after: number;
  material_units_delta: 0;
  uniform_source_scale_required: true;
  complete_target_coverage_required: true;
  atomic_replacement_required: true;
  transient_overlap_allowed: false;
  gameplay_state_committed: false;
}

export interface VoidRealmsTriScaleAtomicConversionReceiptV1 {
  marker: typeof VOID_REALMS_TRISCALE_ATOMIC_CONVERSION_RECEIPT_MARKER;
  version: 1;
  operation: "subdivide" | "merge";
  request_id: string;
  before_revision: number;
  after_revision: number;
  before_state_root_sha256: string;
  after_state_root_sha256: string;
  occupancy_root_before: string;
  occupancy_root_after: string;
  material_units_delta: 0;
  status: "simulated_not_committed";
  atomic_single_revision_transition: true;
  transient_overlap: false;
  world_mutation: false;
  inventory_mutation: false;
  gameplay_state_committed: false;
}

const HEX_32 = /^[0-9a-f]{32}$/;
const PLAYER_SESSION_ID = /^voidrps1_[0-9a-f]{64}$/;
const PLACEMENT_ID = /^voidrtb1_[0-9a-f]{64}$/;
const UTC =
  /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\dZ$/;

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function requireSafeInteger(
  value: unknown,
  label: string,
  minimum = Number.MIN_SAFE_INTEGER,
): number {
  assertCondition(
    Number.isSafeInteger(value) && (value as number) >= minimum,
    `${label} must be a safe integer >= ${minimum}`,
  );
  return value as number;
}

function requireString(value: unknown, label: string, pattern: RegExp): string {
  assertCondition(
    typeof value === "string" &&
      value === value.trim() &&
      pattern.test(value),
    `${label} has invalid format`,
  );
  return value;
}

function requireUtc(value: unknown, label: string): string {
  const text = requireString(value, label, UTC);
  assertCondition(!Number.isNaN(Date.parse(text)), `${label} is invalid`);
  return text;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function sortedUnique(values: readonly string[], label: string): string[] {
  const sorted = [...values].sort();
  assertCondition(
    new Set(sorted).size === sorted.length,
    `${label} must be unique`,
  );
  return sorted;
}

function equalStringArrays(
  left: readonly string[],
  right: readonly string[],
): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function validateBinding(input: {
  manifest: VoidRealmsWorldManifestV1;
  region: VoidRealmsRegionDescriptorV1;
  state: VoidRealmsTriScaleBuildStateV1;
  world_id: string;
  region_id: string;
  expected_revision: number;
}): void {
  assertCondition(
    input.manifest.world_id === input.world_id,
    "manifest world mismatch",
  );
  assertCondition(
    input.region.world_id === input.world_id,
    "region world mismatch",
  );
  assertCondition(
    input.region.region_id === input.region_id,
    "region ID mismatch",
  );
  assertCondition(
    input.state.world_id === input.world_id &&
      input.state.region_id === input.region_id,
    "build state binding mismatch",
  );
  assertCondition(
    requireSafeInteger(input.expected_revision, "expected_revision", 0) ===
      input.state.revision,
    "stale build revision",
  );
}

async function validateStateOccupancy(
  state: VoidRealmsTriScaleBuildStateV1,
): Promise<void> {
  const observed = await occupancyRootForPlacementsV1(state.placements);
  assertCondition(
    observed === state.occupancy_root_sha256,
    "build-state occupancy root mismatch",
  );
}

function placementById(
  state: VoidRealmsTriScaleBuildStateV1,
  placementId: string,
): VoidRealmsTriScalePlacementV1 {
  const placement = state.placements.find(
    (candidate) => candidate.placement_id === placementId,
  );
  assertCondition(placement !== undefined, "source placement does not exist");
  return placement;
}

async function requestIdFor(body: unknown): Promise<string> {
  return `voidrtbr1_${await cidForJson(body)}`;
}

export async function planVoidRealmsTriScaleSubdivisionV1(input: {
  manifest: VoidRealmsWorldManifestV1;
  region: VoidRealmsRegionDescriptorV1;
  state: VoidRealmsTriScaleBuildStateV1;
  request: VoidRealmsTriScaleSubdivideRequestV1;
}): Promise<VoidRealmsTriScaleSubdividePlanV1> {
  const request = input.request;
  assertCondition(
    request.marker === VOID_REALMS_TRISCALE_SUBDIVIDE_REQUEST_MARKER,
    "subdivide request marker mismatch",
  );
  assertCondition(request.version === 1, "subdivide request version mismatch");
  validateBinding({
    ...input,
    world_id: request.world_id,
    region_id: request.region_id,
    expected_revision: request.expected_revision,
  });
  await validateStateOccupancy(input.state);

  const playerSessionId = requireString(
    request.player_session_id,
    "player_session_id",
    PLAYER_SESSION_ID,
  );
  const sourcePlacementId = requireString(
    request.source_placement_id,
    "source_placement_id",
    PLACEMENT_ID,
  );
  const nonce = requireString(
    request.request_nonce_hex,
    "request_nonce_hex",
    HEX_32,
  );
  const requestedAt = requireUtc(request.requested_at_utc, "requested_at_utc");
  const targetProfile = voidRealmsScaleProfileByNameV1(request.target_scale);

  const requestBody = {
    marker: VOID_REALMS_TRISCALE_SUBDIVIDE_REQUEST_MARKER,
    version: 1,
    world_id: request.world_id,
    region_id: request.region_id,
    player_session_id: playerSessionId,
    source_placement_id: sourcePlacementId,
    target_scale: targetProfile.name,
    expected_revision: request.expected_revision,
    request_nonce_hex: nonce,
    requested_at_utc: requestedAt,
  };
  const requestId = await requestIdFor(requestBody);
  assertCondition(
    !input.state.consumed_request_ids.includes(requestId),
    "subdivide request replay detected",
  );

  const source = placementById(input.state, sourcePlacementId);
  assertCondition(
    source.owner_player_session_id === playerSessionId,
    "subdivide request is not from the placement owner",
  );
  const sourceProfile = voidRealmsScaleProfileByNameV1(source.scale);
  assertCondition(
    targetProfile.edge_microcells < sourceProfile.edge_microcells,
    "subdivide target must be smaller than source",
  );
  assertCondition(
    sourceProfile.edge_microcells % targetProfile.edge_microcells === 0,
    "subdivide edge ratio must be integral",
  );
  assertCondition(
    placementFitsRegionV1(
      input.region,
      source.origin_microcell,
      source.edge_microcells,
    ),
    "source placement crosses the region boundary",
  );

  const ratio =
    sourceProfile.edge_microcells / targetProfile.edge_microcells;
  const expectedCount = ratio ** 3;
  const replacements: VoidRealmsTriScalePlacementV1[] = [];
  let childIndex = 0;
  for (
    let dx = 0;
    dx < sourceProfile.edge_microcells;
    dx += targetProfile.edge_microcells
  ) {
    for (
      let dy = 0;
      dy < sourceProfile.edge_microcells;
      dy += targetProfile.edge_microcells
    ) {
      for (
        let dz = 0;
        dz < sourceProfile.edge_microcells;
        dz += targetProfile.edge_microcells
      ) {
        const origin = {
          x: source.origin_microcell.x + dx,
          y: source.origin_microcell.y + dy,
          z: source.origin_microcell.z + dz,
        };
        assertCondition(
          placementOriginIsAlignedV1(
            origin,
            targetProfile.edge_microcells,
          ),
          "derived child placement is misaligned",
        );
        const placementBody = {
          operation: "subdivide",
          request_id: requestId,
          source_placement_id: source.placement_id,
          child_index: childIndex,
          world_id: source.world_id,
          region_id: source.region_id,
          owner_player_session_id: source.owner_player_session_id,
          material_id: source.material_id,
          scale: targetProfile.name,
          origin_microcell: origin,
          placed_at_utc: requestedAt,
        };
        replacements.push({
          placement_id: `voidrtb1_${await cidForJson(placementBody)}`,
          world_id: source.world_id,
          region_id: source.region_id,
          owner_player_session_id: source.owner_player_session_id,
          material_id: source.material_id,
          scale: targetProfile.name,
          selector_index: targetProfile.selector_index,
          origin_microcell: origin,
          edge_microcells: targetProfile.edge_microcells,
          volume_microcells: targetProfile.volume_microcells,
          material_units: targetProfile.material_units,
          placed_at_utc: requestedAt,
        });
        childIndex += 1;
      }
    }
  }

  assertCondition(
    replacements.length === expectedCount,
    "derived subdivision count mismatch",
  );
  const sourceKeys = enumeratePlacementMicrocellKeysV1(
    source.origin_microcell,
    source.edge_microcells,
  );
  const replacementKeys = replacements
    .flatMap((placement) =>
      enumeratePlacementMicrocellKeysV1(
        placement.origin_microcell,
        placement.edge_microcells,
      ),
    )
    .sort();
  assertCondition(
    equalStringArrays(sourceKeys, replacementKeys),
    "subdivision does not preserve exact occupied microcells",
  );

  const materialBefore = source.material_units;
  const materialAfter = replacements.reduce(
    (sum, placement) => sum + placement.material_units,
    0,
  );
  assertCondition(
    materialBefore === materialAfter,
    "subdivision does not conserve material units",
  );

  const otherPlacements = input.state.placements.filter(
    (placement) => placement.placement_id !== source.placement_id,
  );
  const occupancyAfter = await occupancyRootForPlacementsV1([
    ...otherPlacements,
    ...replacements,
  ]);
  assertCondition(
    occupancyAfter === input.state.occupancy_root_sha256,
    "subdivision changes the occupancy root",
  );

  return {
    marker: VOID_REALMS_TRISCALE_SUBDIVIDE_PLAN_MARKER,
    version: 1,
    request_id: requestId,
    status: "planned_requires_authoritative_commit",
    world_id: request.world_id,
    region_id: request.region_id,
    expected_revision: input.state.revision,
    next_revision: input.state.revision + 1,
    source_placement: clone(source),
    target_scale: targetProfile.name,
    replacement_placements: replacements,
    replacement_count: replacements.length,
    occupied_microcell_keys: sourceKeys,
    occupancy_root_before: input.state.occupancy_root_sha256,
    occupancy_root_after: occupancyAfter,
    material_units_before: materialBefore,
    material_units_after: materialAfter,
    material_units_delta: 0,
    atomic_replacement_required: true,
    transient_overlap_allowed: false,
    gameplay_state_committed: false,
  };
}

export async function simulateVoidRealmsTriScaleSubdivisionV1(input: {
  state: VoidRealmsTriScaleBuildStateV1;
  plan: VoidRealmsTriScaleSubdividePlanV1;
}): Promise<{
  state: VoidRealmsTriScaleBuildStateV1;
  receipt: VoidRealmsTriScaleAtomicConversionReceiptV1;
}> {
  assertCondition(
    input.plan.expected_revision === input.state.revision &&
      input.plan.next_revision === input.state.revision + 1,
    "subdivide simulation revision mismatch",
  );
  assertCondition(
    !input.state.consumed_request_ids.includes(input.plan.request_id),
    "subdivide simulation replay detected",
  );
  const sourceExists = input.state.placements.some(
    (placement) =>
      placement.placement_id === input.plan.source_placement.placement_id,
  );
  assertCondition(sourceExists, "subdivide source is missing");

  const placements = input.state.placements.filter(
    (placement) =>
      placement.placement_id !== input.plan.source_placement.placement_id,
  );
  const nextState = await materializeVoidRealmsTriScaleBuildStateV1({
    world_id: input.state.world_id,
    region_id: input.state.region_id,
    revision: input.plan.next_revision,
    material_units_by_id: clone(input.state.material_units_by_id),
    placements: [
      ...placements,
      ...input.plan.replacement_placements.map(clone),
    ],
    consumed_request_ids: [
      ...input.state.consumed_request_ids,
      input.plan.request_id,
    ],
  });
  assertCondition(
    nextState.occupancy_root_sha256 === input.state.occupancy_root_sha256,
    "subdivide simulation changed occupancy",
  );

  return {
    state: nextState,
    receipt: {
      marker: VOID_REALMS_TRISCALE_ATOMIC_CONVERSION_RECEIPT_MARKER,
      version: 1,
      operation: "subdivide",
      request_id: input.plan.request_id,
      before_revision: input.state.revision,
      after_revision: nextState.revision,
      before_state_root_sha256: input.state.state_root_sha256,
      after_state_root_sha256: nextState.state_root_sha256,
      occupancy_root_before: input.state.occupancy_root_sha256,
      occupancy_root_after: nextState.occupancy_root_sha256,
      material_units_delta: 0,
      status: "simulated_not_committed",
      atomic_single_revision_transition: true,
      transient_overlap: false,
      world_mutation: false,
      inventory_mutation: false,
      gameplay_state_committed: false,
    },
  };
}

export async function planVoidRealmsTriScaleMergeV1(input: {
  manifest: VoidRealmsWorldManifestV1;
  region: VoidRealmsRegionDescriptorV1;
  state: VoidRealmsTriScaleBuildStateV1;
  request: VoidRealmsTriScaleMergeRequestV1;
}): Promise<VoidRealmsTriScaleMergePlanV1> {
  const request = input.request;
  assertCondition(
    request.marker === VOID_REALMS_TRISCALE_MERGE_REQUEST_MARKER,
    "merge request marker mismatch",
  );
  assertCondition(request.version === 1, "merge request version mismatch");
  validateBinding({
    ...input,
    world_id: request.world_id,
    region_id: request.region_id,
    expected_revision: request.expected_revision,
  });
  await validateStateOccupancy(input.state);

  const playerSessionId = requireString(
    request.player_session_id,
    "player_session_id",
    PLAYER_SESSION_ID,
  );
  const sourceIds = sortedUnique(
    request.source_placement_ids.map((value) =>
      requireString(value, "source_placement_id", PLACEMENT_ID),
    ),
    "source placement IDs",
  );
  assertCondition(sourceIds.length > 0, "merge source list must not be empty");
  const nonce = requireString(
    request.request_nonce_hex,
    "request_nonce_hex",
    HEX_32,
  );
  const requestedAt = requireUtc(request.requested_at_utc, "requested_at_utc");
  const targetProfile = voidRealmsScaleProfileByNameV1(request.target_scale);
  const targetOrigin = {
    x: requireSafeInteger(request.target_origin_microcell.x, "target_origin.x"),
    y: requireSafeInteger(request.target_origin_microcell.y, "target_origin.y"),
    z: requireSafeInteger(request.target_origin_microcell.z, "target_origin.z"),
  };

  const requestBody = {
    marker: VOID_REALMS_TRISCALE_MERGE_REQUEST_MARKER,
    version: 1,
    world_id: request.world_id,
    region_id: request.region_id,
    player_session_id: playerSessionId,
    source_placement_ids: sourceIds,
    target_scale: targetProfile.name,
    target_origin_microcell: targetOrigin,
    expected_revision: request.expected_revision,
    request_nonce_hex: nonce,
    requested_at_utc: requestedAt,
  };
  const requestId = await requestIdFor(requestBody);
  assertCondition(
    !input.state.consumed_request_ids.includes(requestId),
    "merge request replay detected",
  );

  const sources = sourceIds.map((placementId) =>
    placementById(input.state, placementId),
  );
  for (const placement of sources) {
    assertCondition(
      placement.owner_player_session_id === playerSessionId,
      "merge request includes a placement not owned by the player",
    );
  }

  const sourceProfile = voidRealmsScaleProfileByNameV1(sources[0].scale);
  for (const placement of sources) {
    assertCondition(
      placement.scale === sourceProfile.name,
      "merge sources must use one uniform scale",
    );
    assertCondition(
      placement.material_id === sources[0].material_id,
      "merge sources must use one material",
    );
  }

  assertCondition(
    targetProfile.edge_microcells > sourceProfile.edge_microcells,
    "merge target must be larger than sources",
  );
  assertCondition(
    targetProfile.edge_microcells % sourceProfile.edge_microcells === 0,
    "merge edge ratio must be integral",
  );
  assertCondition(
    placementOriginIsAlignedV1(
      targetOrigin,
      targetProfile.edge_microcells,
    ),
    "merge target origin is misaligned",
  );
  assertCondition(
    placementFitsRegionV1(
      input.region,
      targetOrigin,
      targetProfile.edge_microcells,
    ),
    "merge target crosses the region boundary",
  );

  const ratio =
    targetProfile.edge_microcells / sourceProfile.edge_microcells;
  const expectedCount = ratio ** 3;
  assertCondition(
    sources.length === expectedCount,
    "merge source count does not fill the target",
  );

  const targetKeys = enumeratePlacementMicrocellKeysV1(
    targetOrigin,
    targetProfile.edge_microcells,
  );
  const sourceKeys = sources
    .flatMap((placement) =>
      enumeratePlacementMicrocellKeysV1(
        placement.origin_microcell,
        placement.edge_microcells,
      ),
    )
    .sort();
  assertCondition(
    equalStringArrays(targetKeys, sourceKeys),
    "merge sources do not exactly cover the target",
  );

  const materialBefore = sources.reduce(
    (sum, placement) => sum + placement.material_units,
    0,
  );
  assertCondition(
    materialBefore === targetProfile.material_units,
    "merge sources do not conserve target material units",
  );

  const placementBody = {
    operation: "merge",
    request_id: requestId,
    source_placement_ids: sourceIds,
    world_id: request.world_id,
    region_id: request.region_id,
    owner_player_session_id: playerSessionId,
    material_id: sources[0].material_id,
    scale: targetProfile.name,
    origin_microcell: targetOrigin,
    placed_at_utc: requestedAt,
  };
  const targetPlacement: VoidRealmsTriScalePlacementV1 = {
    placement_id: `voidrtb1_${await cidForJson(placementBody)}`,
    world_id: request.world_id,
    region_id: request.region_id,
    owner_player_session_id: playerSessionId,
    material_id: sources[0].material_id,
    scale: targetProfile.name,
    selector_index: targetProfile.selector_index,
    origin_microcell: targetOrigin,
    edge_microcells: targetProfile.edge_microcells,
    volume_microcells: targetProfile.volume_microcells,
    material_units: targetProfile.material_units,
    placed_at_utc: requestedAt,
  };

  const sourceIdSet = new Set(sourceIds);
  const otherPlacements = input.state.placements.filter(
    (placement) => !sourceIdSet.has(placement.placement_id),
  );
  const occupancyAfter = await occupancyRootForPlacementsV1([
    ...otherPlacements,
    targetPlacement,
  ]);
  assertCondition(
    occupancyAfter === input.state.occupancy_root_sha256,
    "merge changes the occupancy root",
  );

  return {
    marker: VOID_REALMS_TRISCALE_MERGE_PLAN_MARKER,
    version: 1,
    request_id: requestId,
    status: "planned_requires_authoritative_commit",
    world_id: request.world_id,
    region_id: request.region_id,
    expected_revision: input.state.revision,
    next_revision: input.state.revision + 1,
    source_scale: sourceProfile.name,
    source_placements: sources.map(clone),
    source_count: sources.length,
    target_placement: targetPlacement,
    occupied_microcell_keys: targetKeys,
    occupancy_root_before: input.state.occupancy_root_sha256,
    occupancy_root_after: occupancyAfter,
    material_units_before: materialBefore,
    material_units_after: targetPlacement.material_units,
    material_units_delta: 0,
    uniform_source_scale_required: true,
    complete_target_coverage_required: true,
    atomic_replacement_required: true,
    transient_overlap_allowed: false,
    gameplay_state_committed: false,
  };
}

export async function simulateVoidRealmsTriScaleMergeV1(input: {
  state: VoidRealmsTriScaleBuildStateV1;
  plan: VoidRealmsTriScaleMergePlanV1;
}): Promise<{
  state: VoidRealmsTriScaleBuildStateV1;
  receipt: VoidRealmsTriScaleAtomicConversionReceiptV1;
}> {
  assertCondition(
    input.plan.expected_revision === input.state.revision &&
      input.plan.next_revision === input.state.revision + 1,
    "merge simulation revision mismatch",
  );
  assertCondition(
    !input.state.consumed_request_ids.includes(input.plan.request_id),
    "merge simulation replay detected",
  );
  const sourceIds = new Set(
    input.plan.source_placements.map(
      (placement) => placement.placement_id,
    ),
  );
  const observedSourceCount = input.state.placements.filter(
    (placement) => sourceIds.has(placement.placement_id),
  ).length;
  assertCondition(
    observedSourceCount === sourceIds.size,
    "merge simulation source is missing",
  );

  const placements = input.state.placements.filter(
    (placement) => !sourceIds.has(placement.placement_id),
  );
  const nextState = await materializeVoidRealmsTriScaleBuildStateV1({
    world_id: input.state.world_id,
    region_id: input.state.region_id,
    revision: input.plan.next_revision,
    material_units_by_id: clone(input.state.material_units_by_id),
    placements: [
      ...placements,
      clone(input.plan.target_placement),
    ],
    consumed_request_ids: [
      ...input.state.consumed_request_ids,
      input.plan.request_id,
    ],
  });
  assertCondition(
    nextState.occupancy_root_sha256 === input.state.occupancy_root_sha256,
    "merge simulation changed occupancy",
  );

  return {
    state: nextState,
    receipt: {
      marker: VOID_REALMS_TRISCALE_ATOMIC_CONVERSION_RECEIPT_MARKER,
      version: 1,
      operation: "merge",
      request_id: input.plan.request_id,
      before_revision: input.state.revision,
      after_revision: nextState.revision,
      before_state_root_sha256: input.state.state_root_sha256,
      after_state_root_sha256: nextState.state_root_sha256,
      occupancy_root_before: input.state.occupancy_root_sha256,
      occupancy_root_after: nextState.occupancy_root_sha256,
      material_units_delta: 0,
      status: "simulated_not_committed",
      atomic_single_revision_transition: true,
      transient_overlap: false,
      world_mutation: false,
      inventory_mutation: false,
      gameplay_state_committed: false,
    },
  };
}
