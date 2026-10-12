// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import { cidForJson, stableStringify } from "../util/cid.js";
import type {
  VoidRealmsRegionDescriptorV1,
  VoidRealmsWorldManifestV1,
} from "./void_realms_single_canonical_world_region_checkpoint_handoff_v1.js";
import {
  VOID_REALMS_TRISCALE_STATE_MARKER,
  occupancyRootForPlacementsV1,
  placementFitsRegionV1,
  placementOriginIsAlignedV1,
  planVoidRealmsTriScaleBreakV1,
  planVoidRealmsTriScalePlacementV1,
  simulateVoidRealmsTriScaleBreakV1,
  simulateVoidRealmsTriScalePlacementV1,
  voidRealmsScaleProfileByNameV1,
  type VoidRealmsTriScaleBreakPlanV1,
  type VoidRealmsTriScaleBreakRequestV1,
  type VoidRealmsTriScaleBuildStateV1,
  type VoidRealmsTriScalePlacePlanV1,
  type VoidRealmsTriScalePlaceRequestV1,
  type VoidRealmsTriScalePlacementV1,
  type VoidRealmsTriScaleSimulationReceiptV1,
} from "./void_realms_triscale_building_v1.js";
import {
  planVoidRealmsTriScaleMergeV1,
  planVoidRealmsTriScaleSubdivisionV1,
  simulateVoidRealmsTriScaleMergeV1,
  simulateVoidRealmsTriScaleSubdivisionV1,
  type VoidRealmsTriScaleAtomicConversionReceiptV1,
  type VoidRealmsTriScaleMergePlanV1,
  type VoidRealmsTriScaleMergeRequestV1,
  type VoidRealmsTriScaleSubdividePlanV1,
  type VoidRealmsTriScaleSubdivideRequestV1,
} from "./void_realms_triscale_atomic_subdivide_merge_v1.js";

export const VOID_REALMS_TRISCALE_STATE_TRANSITION_INTEGRITY_GUARD_MARKER =
  "VOID_REALMS_TRISCALE_STATE_TRANSITION_INTEGRITY_GUARD_V1" as const;

export interface VoidRealmsTriScaleBuildStateIntegrityVerificationV1 {
  marker: typeof VOID_REALMS_TRISCALE_STATE_TRANSITION_INTEGRITY_GUARD_MARKER;
  version: 1;
  verified: true;
  world_id: string;
  region_id: string;
  revision: number;
  state_root_sha256: string;
  occupancy_root_sha256: string;
  material_count: number;
  placement_count: number;
  consumed_request_count: number;
  deterministic_utf16_ordering: true;
}

export interface VoidRealmsTriScaleTransitionIntegrityVerificationV1 {
  marker: typeof VOID_REALMS_TRISCALE_STATE_TRANSITION_INTEGRITY_GUARD_MARKER;
  version: 1;
  verified: true;
  action: "place" | "break" | "subdivide" | "merge";
  request_id: string;
  before_state_root_sha256: string;
  after_state_root_sha256: string;
  before_revision: number;
  after_revision: number;
  occupancy_root_before: string;
  occupancy_root_after: string;
  material_units_delta: number;
  state_roots_verified: true;
  plan_reconstructed_exactly: true;
  after_state_reconstructed_exactly: true;
  receipt_reconstructed_exactly: true;
  deterministic_utf16_ordering: true;
  world_mutation: false;
  inventory_mutation: false;
  gameplay_state_committed: false;
}

export interface VoidRealmsTriScalePlaceTransitionEvidenceV1 {
  manifest: VoidRealmsWorldManifestV1;
  region: VoidRealmsRegionDescriptorV1;
  before_state: VoidRealmsTriScaleBuildStateV1;
  request: VoidRealmsTriScalePlaceRequestV1;
  plan: VoidRealmsTriScalePlacePlanV1;
  after_state: VoidRealmsTriScaleBuildStateV1;
  receipt: VoidRealmsTriScaleSimulationReceiptV1;
}

export interface VoidRealmsTriScaleBreakTransitionEvidenceV1 {
  manifest: VoidRealmsWorldManifestV1;
  region: VoidRealmsRegionDescriptorV1;
  before_state: VoidRealmsTriScaleBuildStateV1;
  request: VoidRealmsTriScaleBreakRequestV1;
  plan: VoidRealmsTriScaleBreakPlanV1;
  after_state: VoidRealmsTriScaleBuildStateV1;
  receipt: VoidRealmsTriScaleSimulationReceiptV1;
}

export interface VoidRealmsTriScaleSubdivisionTransitionEvidenceV1 {
  manifest: VoidRealmsWorldManifestV1;
  region: VoidRealmsRegionDescriptorV1;
  before_state: VoidRealmsTriScaleBuildStateV1;
  request: VoidRealmsTriScaleSubdivideRequestV1;
  plan: VoidRealmsTriScaleSubdividePlanV1;
  after_state: VoidRealmsTriScaleBuildStateV1;
  receipt: VoidRealmsTriScaleAtomicConversionReceiptV1;
}

export interface VoidRealmsTriScaleMergeTransitionEvidenceV1 {
  manifest: VoidRealmsWorldManifestV1;
  region: VoidRealmsRegionDescriptorV1;
  before_state: VoidRealmsTriScaleBuildStateV1;
  request: VoidRealmsTriScaleMergeRequestV1;
  plan: VoidRealmsTriScaleMergePlanV1;
  after_state: VoidRealmsTriScaleBuildStateV1;
  receipt: VoidRealmsTriScaleAtomicConversionReceiptV1;
}

const HEX_64 = /^[0-9a-f]{64}$/;
const WORLD_ID = /^voidrw1_[0-9a-f]{64}$/;
const REGION_ID = /^voidrr1_[0-9a-f]{64}$/;
const PLAYER_SESSION_ID = /^voidrps1_[0-9a-f]{64}$/;
const MATERIAL_ID = /^voidmat1_[0-9a-f]{64}$/;
const PLACEMENT_ID = /^voidrtb1_[0-9a-f]{64}$/;
const REQUEST_ID = /^voidrtbr1_[0-9a-f]{64}$/;
const UTC =
  /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\dZ$/;

const STATE_KEYS = [
  "marker",
  "version",
  "world_id",
  "region_id",
  "revision",
  "material_units_by_id",
  "placements",
  "consumed_request_ids",
  "occupancy_root_sha256",
  "state_root_sha256",
] as const;

const PLACEMENT_KEYS = [
  "placement_id",
  "world_id",
  "region_id",
  "owner_player_session_id",
  "material_id",
  "scale",
  "selector_index",
  "origin_microcell",
  "edge_microcells",
  "volume_microcells",
  "material_units",
  "placed_at_utc",
] as const;

const POSITION_KEYS = ["x", "y", "z"] as const;

const PLACE_REQUEST_KEYS = [
  "marker",
  "version",
  "world_id",
  "region_id",
  "player_session_id",
  "material_id",
  "selector_value",
  "origin_microcell",
  "expected_revision",
  "request_nonce_hex",
  "requested_at_utc",
] as const;

const BREAK_REQUEST_KEYS = [
  "marker",
  "version",
  "world_id",
  "region_id",
  "player_session_id",
  "placement_id",
  "expected_revision",
  "request_nonce_hex",
  "requested_at_utc",
] as const;

const SUBDIVIDE_REQUEST_KEYS = [
  "marker",
  "version",
  "world_id",
  "region_id",
  "player_session_id",
  "source_placement_id",
  "target_scale",
  "expected_revision",
  "request_nonce_hex",
  "requested_at_utc",
] as const;

const MERGE_REQUEST_KEYS = [
  "marker",
  "version",
  "world_id",
  "region_id",
  "player_session_id",
  "source_placement_ids",
  "target_scale",
  "target_origin_microcell",
  "expected_revision",
  "request_nonce_hex",
  "requested_at_utc",
] as const;

const TRANSITION_EVIDENCE_KEYS = [
  "manifest",
  "region",
  "before_state",
  "request",
  "plan",
  "after_state",
  "receipt",
] as const;

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function compareUtf16(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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
    stableStringify(actual) === stableStringify(wanted),
    `${label} keys mismatch`,
  );
}

function assertExactValue(actual: unknown, expected: unknown, label: string): void {
  assertCondition(
    stableStringify(actual) === stableStringify(expected),
    `${label} mismatch`,
  );
}

function requireString(value: unknown, label: string, pattern: RegExp): string {
  assertCondition(
    typeof value === "string" && value === value.trim() && pattern.test(value),
    `${label} has invalid format`,
  );
  return value;
}

function requireUtc(value: unknown, label: string): string {
  const text = requireString(value, label, UTC);
  assertCondition(!Number.isNaN(Date.parse(text)), `${label} is invalid`);
  return text;
}

function requireSafeInteger(
  value: unknown,
  label: string,
  minimum = Number.MIN_SAFE_INTEGER,
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

function sortedRecordUtf16(input: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(input).sort(([left], [right]) => compareUtf16(left, right)),
  );
}

function validateRequestOrigin(value: unknown, label: string): void {
  assertExactKeys(value, label, POSITION_KEYS);
  const record = requireRecord(value, label);
  requireSafeInteger(record.x, `${label}.x`);
  requireSafeInteger(record.y, `${label}.y`);
  requireSafeInteger(record.z, `${label}.z`);
}

function validatePlacementV1(
  placement: VoidRealmsTriScalePlacementV1,
  state: VoidRealmsTriScaleBuildStateV1,
  region: VoidRealmsRegionDescriptorV1,
): void {
  assertExactKeys(placement, "tri-scale placement", PLACEMENT_KEYS);
  requireString(placement.placement_id, "placement_id", PLACEMENT_ID);
  requireString(placement.world_id, "placement world_id", WORLD_ID);
  requireString(placement.region_id, "placement region_id", REGION_ID);
  requireString(
    placement.owner_player_session_id,
    "owner_player_session_id",
    PLAYER_SESSION_ID,
  );
  requireString(placement.material_id, "placement material_id", MATERIAL_ID);
  requireUtc(placement.placed_at_utc, "placed_at_utc");
  assertExactKeys(placement.origin_microcell, "placement origin", POSITION_KEYS);
  requireSafeInteger(placement.origin_microcell.x, "placement origin.x");
  requireSafeInteger(placement.origin_microcell.y, "placement origin.y");
  requireSafeInteger(placement.origin_microcell.z, "placement origin.z");
  assertCondition(
    placement.world_id === state.world_id &&
      placement.region_id === state.region_id,
    "placement state binding mismatch",
  );
  const profile = voidRealmsScaleProfileByNameV1(placement.scale);
  assertCondition(
    placement.selector_index === profile.selector_index &&
      placement.edge_microcells === profile.edge_microcells &&
      placement.volume_microcells === profile.volume_microcells &&
      placement.material_units === profile.material_units,
    "placement profile mismatch",
  );
  assertCondition(
    placementOriginIsAlignedV1(
      placement.origin_microcell,
      placement.edge_microcells,
    ),
    "placement origin is not aligned",
  );
  assertCondition(
    placementFitsRegionV1(
      region,
      placement.origin_microcell,
      placement.edge_microcells,
    ),
    "placement crosses the region boundary",
  );
}

function validatePlaceRequest(request: VoidRealmsTriScalePlaceRequestV1): void {
  assertExactKeys(request, "place request", PLACE_REQUEST_KEYS);
  validateRequestOrigin(request.origin_microcell, "place request origin");
}

function validateBreakRequest(request: VoidRealmsTriScaleBreakRequestV1): void {
  assertExactKeys(request, "break request", BREAK_REQUEST_KEYS);
}

function validateSubdivisionRequest(
  request: VoidRealmsTriScaleSubdivideRequestV1,
): void {
  assertExactKeys(request, "subdivide request", SUBDIVIDE_REQUEST_KEYS);
}

function validateMergeRequest(request: VoidRealmsTriScaleMergeRequestV1): void {
  assertExactKeys(request, "merge request", MERGE_REQUEST_KEYS);
  validateRequestOrigin(request.target_origin_microcell, "merge target origin");
  assertCondition(
    Array.isArray(request.source_placement_ids),
    "merge source placement IDs must be an array",
  );
}

export async function verifyVoidRealmsTriScaleBuildStateIntegrityV1(
  state: VoidRealmsTriScaleBuildStateV1,
  region: VoidRealmsRegionDescriptorV1,
): Promise<VoidRealmsTriScaleBuildStateIntegrityVerificationV1> {
  assertExactKeys(state, "tri-scale build state", STATE_KEYS);
  assertCondition(
    state.marker === VOID_REALMS_TRISCALE_STATE_MARKER,
    "build-state marker mismatch",
  );
  assertCondition(state.version === 1, "build-state version mismatch");
  requireString(state.world_id, "build-state world_id", WORLD_ID);
  requireString(state.region_id, "build-state region_id", REGION_ID);
  const revision = requireSafeInteger(state.revision, "build-state revision", 0);
  requireString(
    state.occupancy_root_sha256,
    "occupancy_root_sha256",
    HEX_64,
  );
  requireString(state.state_root_sha256, "state_root_sha256", HEX_64);
  assertCondition(
    region.world_id === state.world_id && region.region_id === state.region_id,
    "build-state region binding mismatch",
  );

  const balanceRecord = requireRecord(
    state.material_units_by_id,
    "material_units_by_id",
  );
  const balances: Record<string, number> = {};
  for (const [materialId, units] of Object.entries(balanceRecord)) {
    requireString(materialId, "material_id", MATERIAL_ID);
    balances[materialId] = requireSafeInteger(
      units,
      `material balance ${materialId}`,
      0,
    );
  }

  assertCondition(Array.isArray(state.placements), "placements must be an array");
  const placements = state.placements.map((placement) => clone(placement));
  for (const placement of placements) {
    validatePlacementV1(placement, state, region);
  }
  const placementIds = placements.map((placement) => placement.placement_id);
  assertCondition(
    new Set(placementIds).size === placementIds.length,
    "placement IDs must be unique",
  );
  const canonicalPlacements = [...placements].sort((left, right) =>
    compareUtf16(left.placement_id, right.placement_id),
  );
  assertExactValue(
    state.placements,
    canonicalPlacements,
    "build-state placement ordering",
  );

  assertCondition(
    Array.isArray(state.consumed_request_ids),
    "consumed request IDs must be an array",
  );
  const requests = [...state.consumed_request_ids];
  for (const requestId of requests) {
    requireString(requestId, "consumed request_id", REQUEST_ID);
  }
  assertCondition(
    new Set(requests).size === requests.length,
    "consumed request IDs must be unique",
  );
  const canonicalRequests = [...requests].sort(compareUtf16);
  assertExactValue(
    state.consumed_request_ids,
    canonicalRequests,
    "consumed request ordering",
  );

  const occupancyRoot = await occupancyRootForPlacementsV1(canonicalPlacements);
  assertCondition(
    state.occupancy_root_sha256 === occupancyRoot,
    "build-state occupancy root mismatch",
  );
  const body = {
    marker: VOID_REALMS_TRISCALE_STATE_MARKER,
    version: 1 as const,
    world_id: state.world_id,
    region_id: state.region_id,
    revision,
    material_units_by_id: sortedRecordUtf16(balances),
    placements: canonicalPlacements,
    consumed_request_ids: canonicalRequests,
    occupancy_root_sha256: occupancyRoot,
  };
  const expectedStateRoot = await cidForJson(body);
  assertCondition(
    state.state_root_sha256 === expectedStateRoot,
    "build-state content address mismatch",
  );

  return {
    marker: VOID_REALMS_TRISCALE_STATE_TRANSITION_INTEGRITY_GUARD_MARKER,
    version: 1,
    verified: true,
    world_id: state.world_id,
    region_id: state.region_id,
    revision,
    state_root_sha256: state.state_root_sha256,
    occupancy_root_sha256: occupancyRoot,
    material_count: Object.keys(balances).length,
    placement_count: canonicalPlacements.length,
    consumed_request_count: canonicalRequests.length,
    deterministic_utf16_ordering: true,
  };
}

async function finalizeTransitionVerification(input: {
  action: "place" | "break" | "subdivide" | "merge";
  request_id: string;
  before_state: VoidRealmsTriScaleBuildStateV1;
  after_state: VoidRealmsTriScaleBuildStateV1;
  material_units_delta: number;
}): Promise<VoidRealmsTriScaleTransitionIntegrityVerificationV1> {
  requireString(input.request_id, "transition request_id", REQUEST_ID);
  assertCondition(
    input.after_state.revision === input.before_state.revision + 1,
    "transition revision must advance exactly once",
  );
  assertCondition(
    input.after_state.state_root_sha256 !== input.before_state.state_root_sha256,
    "transition state root did not change",
  );
  return {
    marker: VOID_REALMS_TRISCALE_STATE_TRANSITION_INTEGRITY_GUARD_MARKER,
    version: 1,
    verified: true,
    action: input.action,
    request_id: input.request_id,
    before_state_root_sha256: input.before_state.state_root_sha256,
    after_state_root_sha256: input.after_state.state_root_sha256,
    before_revision: input.before_state.revision,
    after_revision: input.after_state.revision,
    occupancy_root_before: input.before_state.occupancy_root_sha256,
    occupancy_root_after: input.after_state.occupancy_root_sha256,
    material_units_delta: input.material_units_delta,
    state_roots_verified: true,
    plan_reconstructed_exactly: true,
    after_state_reconstructed_exactly: true,
    receipt_reconstructed_exactly: true,
    deterministic_utf16_ordering: true,
    world_mutation: false,
    inventory_mutation: false,
    gameplay_state_committed: false,
  };
}

export async function verifyVoidRealmsTriScalePlaceTransitionIntegrityV1(
  evidence: VoidRealmsTriScalePlaceTransitionEvidenceV1,
): Promise<VoidRealmsTriScaleTransitionIntegrityVerificationV1> {
  assertExactKeys(evidence, "place transition evidence", TRANSITION_EVIDENCE_KEYS);
  validatePlaceRequest(evidence.request);
  await verifyVoidRealmsTriScaleBuildStateIntegrityV1(
    evidence.before_state,
    evidence.region,
  );
  const expectedPlan = await planVoidRealmsTriScalePlacementV1({
    manifest: evidence.manifest,
    region: evidence.region,
    state: evidence.before_state,
    request: evidence.request,
  });
  assertExactValue(evidence.plan, expectedPlan, "place plan");
  const expectedResult = await simulateVoidRealmsTriScalePlacementV1({
    state: evidence.before_state,
    plan: expectedPlan,
  });
  assertExactValue(evidence.after_state, expectedResult.state, "place after state");
  assertExactValue(evidence.receipt, expectedResult.receipt, "place receipt");
  await verifyVoidRealmsTriScaleBuildStateIntegrityV1(
    evidence.after_state,
    evidence.region,
  );
  return finalizeTransitionVerification({
    action: "place",
    request_id: expectedPlan.request_id,
    before_state: evidence.before_state,
    after_state: evidence.after_state,
    material_units_delta: expectedResult.receipt.material_units_delta,
  });
}

export async function verifyVoidRealmsTriScaleBreakTransitionIntegrityV1(
  evidence: VoidRealmsTriScaleBreakTransitionEvidenceV1,
): Promise<VoidRealmsTriScaleTransitionIntegrityVerificationV1> {
  assertExactKeys(evidence, "break transition evidence", TRANSITION_EVIDENCE_KEYS);
  validateBreakRequest(evidence.request);
  await verifyVoidRealmsTriScaleBuildStateIntegrityV1(
    evidence.before_state,
    evidence.region,
  );
  const expectedPlan = await planVoidRealmsTriScaleBreakV1({
    manifest: evidence.manifest,
    region: evidence.region,
    state: evidence.before_state,
    request: evidence.request,
  });
  assertExactValue(evidence.plan, expectedPlan, "break plan");
  const expectedResult = await simulateVoidRealmsTriScaleBreakV1({
    state: evidence.before_state,
    plan: expectedPlan,
  });
  assertExactValue(evidence.after_state, expectedResult.state, "break after state");
  assertExactValue(evidence.receipt, expectedResult.receipt, "break receipt");
  await verifyVoidRealmsTriScaleBuildStateIntegrityV1(
    evidence.after_state,
    evidence.region,
  );
  return finalizeTransitionVerification({
    action: "break",
    request_id: expectedPlan.request_id,
    before_state: evidence.before_state,
    after_state: evidence.after_state,
    material_units_delta: expectedResult.receipt.material_units_delta,
  });
}

export async function verifyVoidRealmsTriScaleSubdivisionTransitionIntegrityV1(
  evidence: VoidRealmsTriScaleSubdivisionTransitionEvidenceV1,
): Promise<VoidRealmsTriScaleTransitionIntegrityVerificationV1> {
  assertExactKeys(
    evidence,
    "subdivision transition evidence",
    TRANSITION_EVIDENCE_KEYS,
  );
  validateSubdivisionRequest(evidence.request);
  await verifyVoidRealmsTriScaleBuildStateIntegrityV1(
    evidence.before_state,
    evidence.region,
  );
  const expectedPlan = await planVoidRealmsTriScaleSubdivisionV1({
    manifest: evidence.manifest,
    region: evidence.region,
    state: evidence.before_state,
    request: evidence.request,
  });
  assertExactValue(evidence.plan, expectedPlan, "subdivision plan");
  const expectedResult = await simulateVoidRealmsTriScaleSubdivisionV1({
    state: evidence.before_state,
    plan: expectedPlan,
  });
  assertExactValue(
    evidence.after_state,
    expectedResult.state,
    "subdivision after state",
  );
  assertExactValue(
    evidence.receipt,
    expectedResult.receipt,
    "subdivision receipt",
  );
  await verifyVoidRealmsTriScaleBuildStateIntegrityV1(
    evidence.after_state,
    evidence.region,
  );
  return finalizeTransitionVerification({
    action: "subdivide",
    request_id: expectedPlan.request_id,
    before_state: evidence.before_state,
    after_state: evidence.after_state,
    material_units_delta: expectedResult.receipt.material_units_delta,
  });
}

export async function verifyVoidRealmsTriScaleMergeTransitionIntegrityV1(
  evidence: VoidRealmsTriScaleMergeTransitionEvidenceV1,
): Promise<VoidRealmsTriScaleTransitionIntegrityVerificationV1> {
  assertExactKeys(evidence, "merge transition evidence", TRANSITION_EVIDENCE_KEYS);
  validateMergeRequest(evidence.request);
  await verifyVoidRealmsTriScaleBuildStateIntegrityV1(
    evidence.before_state,
    evidence.region,
  );
  const expectedPlan = await planVoidRealmsTriScaleMergeV1({
    manifest: evidence.manifest,
    region: evidence.region,
    state: evidence.before_state,
    request: evidence.request,
  });
  assertExactValue(evidence.plan, expectedPlan, "merge plan");
  const expectedResult = await simulateVoidRealmsTriScaleMergeV1({
    state: evidence.before_state,
    plan: expectedPlan,
  });
  assertExactValue(evidence.after_state, expectedResult.state, "merge after state");
  assertExactValue(evidence.receipt, expectedResult.receipt, "merge receipt");
  await verifyVoidRealmsTriScaleBuildStateIntegrityV1(
    evidence.after_state,
    evidence.region,
  );
  return finalizeTransitionVerification({
    action: "merge",
    request_id: expectedPlan.request_id,
    before_state: evidence.before_state,
    after_state: evidence.after_state,
    material_units_delta: expectedResult.receipt.material_units_delta,
  });
}
