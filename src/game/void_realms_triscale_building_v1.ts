// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import { cidForJson } from "../util/cid.js";
import type {
  VoidRealmsRegionDescriptorV1,
  VoidRealmsWorldManifestV1,
} from "./void_realms_single_canonical_world_region_checkpoint_handoff_v1.js";

export const VOID_REALMS_TRISCALE_CONFIG_MARKER =
  "VOID_REALMS_TRISCALE_BUILDING_CONFIG_V1" as const;
export const VOID_REALMS_TRISCALE_STATE_MARKER =
  "VOID_REALMS_TRISCALE_BUILD_STATE_V1" as const;
export const VOID_REALMS_TRISCALE_PLACE_REQUEST_MARKER =
  "VOID_REALMS_TRISCALE_PLACE_REQUEST_V1" as const;
export const VOID_REALMS_TRISCALE_PLACE_PLAN_MARKER =
  "VOID_REALMS_TRISCALE_PLACE_PLAN_V1" as const;
export const VOID_REALMS_TRISCALE_BREAK_REQUEST_MARKER =
  "VOID_REALMS_TRISCALE_BREAK_REQUEST_V1" as const;
export const VOID_REALMS_TRISCALE_BREAK_PLAN_MARKER =
  "VOID_REALMS_TRISCALE_BREAK_PLAN_V1" as const;
export const VOID_REALMS_TRISCALE_SIMULATION_RECEIPT_MARKER =
  "VOID_REALMS_TRISCALE_SIMULATION_RECEIPT_V1" as const;

export const MICROCELLS_PER_STANDARD_EDGE = 4 as const;

export type VoidRealmsBuildScaleV1 = "small" | "medium" | "standard";

export interface VoidRealmsScaleProfileV1 {
  selector_index: 0 | 1 | 2;
  name: VoidRealmsBuildScaleV1;
  edge_microcells: 1 | 2 | 4;
  edge_ratio_numerator: 1;
  edge_ratio_denominator: 4 | 2 | 1;
  volume_microcells: 1 | 8 | 64;
  material_units: 1 | 8 | 64;
}

export const VOID_REALMS_SCALE_PROFILES_V1: readonly VoidRealmsScaleProfileV1[] =
  Object.freeze([
    Object.freeze({
      selector_index: 0,
      name: "small",
      edge_microcells: 1,
      edge_ratio_numerator: 1,
      edge_ratio_denominator: 4,
      volume_microcells: 1,
      material_units: 1,
    }),
    Object.freeze({
      selector_index: 1,
      name: "medium",
      edge_microcells: 2,
      edge_ratio_numerator: 1,
      edge_ratio_denominator: 2,
      volume_microcells: 8,
      material_units: 8,
    }),
    Object.freeze({
      selector_index: 2,
      name: "standard",
      edge_microcells: 4,
      edge_ratio_numerator: 1,
      edge_ratio_denominator: 1,
      volume_microcells: 64,
      material_units: 64,
    }),
  ]);

export interface VoidRealmsMicrocellPositionV1 {
  x: number;
  y: number;
  z: number;
}

export interface VoidRealmsTriScalePlacementV1 {
  placement_id: string;
  world_id: string;
  region_id: string;
  owner_player_session_id: string;
  material_id: string;
  scale: VoidRealmsBuildScaleV1;
  selector_index: 0 | 1 | 2;
  origin_microcell: VoidRealmsMicrocellPositionV1;
  edge_microcells: 1 | 2 | 4;
  volume_microcells: 1 | 8 | 64;
  material_units: 1 | 8 | 64;
  placed_at_utc: string;
}

export interface VoidRealmsTriScaleBuildStateV1 {
  marker: typeof VOID_REALMS_TRISCALE_STATE_MARKER;
  version: 1;
  world_id: string;
  region_id: string;
  revision: number;
  material_units_by_id: Record<string, number>;
  placements: VoidRealmsTriScalePlacementV1[];
  consumed_request_ids: string[];
  occupancy_root_sha256: string;
  state_root_sha256: string;
}

export interface VoidRealmsTriScalePlaceRequestV1 {
  marker: typeof VOID_REALMS_TRISCALE_PLACE_REQUEST_MARKER;
  version: 1;
  world_id: string;
  region_id: string;
  player_session_id: string;
  material_id: string;
  selector_value: number;
  origin_microcell: VoidRealmsMicrocellPositionV1;
  expected_revision: number;
  request_nonce_hex: string;
  requested_at_utc: string;
}

export interface VoidRealmsTriScalePlacePlanV1 {
  marker: typeof VOID_REALMS_TRISCALE_PLACE_PLAN_MARKER;
  version: 1;
  request_id: string;
  status: "planned_requires_authoritative_commit";
  world_id: string;
  region_id: string;
  expected_revision: number;
  next_revision: number;
  placement: VoidRealmsTriScalePlacementV1;
  occupied_microcell_keys: string[];
  material_units_before: number;
  material_units_after: number;
  client_material_cost_trusted: false;
  server_derived_material_cost: true;
  gameplay_state_committed: false;
}

export interface VoidRealmsTriScaleBreakRequestV1 {
  marker: typeof VOID_REALMS_TRISCALE_BREAK_REQUEST_MARKER;
  version: 1;
  world_id: string;
  region_id: string;
  player_session_id: string;
  placement_id: string;
  expected_revision: number;
  request_nonce_hex: string;
  requested_at_utc: string;
}

export interface VoidRealmsTriScaleBreakPlanV1 {
  marker: typeof VOID_REALMS_TRISCALE_BREAK_PLAN_MARKER;
  version: 1;
  request_id: string;
  status: "planned_requires_authoritative_commit";
  world_id: string;
  region_id: string;
  expected_revision: number;
  next_revision: number;
  placement: VoidRealmsTriScalePlacementV1;
  released_microcell_keys: string[];
  material_units_before: number;
  material_units_after: number;
  whole_piece_break_only: true;
  gameplay_state_committed: false;
}

export interface VoidRealmsTriScaleSimulationReceiptV1 {
  marker: typeof VOID_REALMS_TRISCALE_SIMULATION_RECEIPT_MARKER;
  version: 1;
  action: "place" | "break";
  request_id: string;
  before_state_root_sha256: string;
  after_state_root_sha256: string;
  before_revision: number;
  after_revision: number;
  material_units_delta: number;
  status: "simulated_not_committed";
  world_mutation: false;
  inventory_mutation: false;
  gameplay_state_committed: false;
}

const HEX_64 = /^[0-9a-f]{64}$/;
const HEX_32 = /^[0-9a-f]{32}$/;
const WORLD_ID = /^voidrw1_[0-9a-f]{64}$/;
const REGION_ID = /^voidrr1_[0-9a-f]{64}$/;
const PLAYER_SESSION_ID = /^voidrps1_[0-9a-f]{64}$/;
const MATERIAL_ID = /^voidmat1_[0-9a-f]{64}$/;
const PLACEMENT_ID = /^voidrtb1_[0-9a-f]{64}$/;
const REQUEST_ID = /^voidrtbr1_[0-9a-f]{64}$/;
const UTC =
  /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\dZ$/;

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
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

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function sortedRecord(input: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(input).sort(([left], [right]) => left.localeCompare(right)),
  );
}

export function normalizeVoidRealmsSelectorValueV1(value: unknown): 0 | 1 | 2 {
  assertCondition(
    typeof value === "number" && Number.isFinite(value),
    "selector value must be finite",
  );
  const rounded = Math.round(value);
  const clamped = Math.min(2, Math.max(0, rounded));
  return clamped as 0 | 1 | 2;
}

export function voidRealmsScaleProfileFromSelectorV1(
  value: unknown,
): VoidRealmsScaleProfileV1 {
  return VOID_REALMS_SCALE_PROFILES_V1[
    normalizeVoidRealmsSelectorValueV1(value)
  ];
}

export function voidRealmsScaleProfileByNameV1(
  scale: VoidRealmsBuildScaleV1,
): VoidRealmsScaleProfileV1 {
  const profile = VOID_REALMS_SCALE_PROFILES_V1.find(
    (candidate) => candidate.name === scale,
  );
  assertCondition(profile !== undefined, "unknown build scale");
  return profile;
}

export function nodeCoordinateToMicrocellOriginV1(nodeCoordinate: number): number {
  return (
    requireSafeInteger(nodeCoordinate, "node coordinate") *
    MICROCELLS_PER_STANDARD_EDGE
  );
}

export function microcellToNodeCoordinateV1(microcellCoordinate: number): number {
  return Math.floor(
    requireSafeInteger(microcellCoordinate, "microcell coordinate") /
      MICROCELLS_PER_STANDARD_EDGE,
  );
}

export function validateVoidRealmsMicrocellPositionV1(
  value: VoidRealmsMicrocellPositionV1,
): VoidRealmsMicrocellPositionV1 {
  return {
    x: requireSafeInteger(value.x, "origin_microcell.x"),
    y: requireSafeInteger(value.y, "origin_microcell.y"),
    z: requireSafeInteger(value.z, "origin_microcell.z"),
  };
}

export function placementOriginIsAlignedV1(
  origin: VoidRealmsMicrocellPositionV1,
  edgeMicrocells: 1 | 2 | 4,
): boolean {
  return (
    positiveModulo(origin.x, edgeMicrocells) === 0 &&
    positiveModulo(origin.y, edgeMicrocells) === 0 &&
    positiveModulo(origin.z, edgeMicrocells) === 0
  );
}

export function enumeratePlacementMicrocellKeysV1(
  originValue: VoidRealmsMicrocellPositionV1,
  edgeMicrocells: 1 | 2 | 4,
): string[] {
  const origin = validateVoidRealmsMicrocellPositionV1(originValue);
  const keys: string[] = [];
  for (let dx = 0; dx < edgeMicrocells; dx += 1) {
    for (let dy = 0; dy < edgeMicrocells; dy += 1) {
      for (let dz = 0; dz < edgeMicrocells; dz += 1) {
        keys.push(`${origin.x + dx}:${origin.y + dy}:${origin.z + dz}`);
      }
    }
  }
  keys.sort();
  return keys;
}

export function placementFitsRegionV1(
  region: VoidRealmsRegionDescriptorV1,
  originValue: VoidRealmsMicrocellPositionV1,
  edgeMicrocells: 1 | 2 | 4,
): boolean {
  const origin = validateVoidRealmsMicrocellPositionV1(originValue);
  const minimumX =
    region.minimum_x * MICROCELLS_PER_STANDARD_EDGE;
  const maximumXExclusive =
    (region.maximum_x + 1) * MICROCELLS_PER_STANDARD_EDGE;
  const minimumY =
    region.minimum_y * MICROCELLS_PER_STANDARD_EDGE;
  const maximumYExclusive =
    (region.maximum_y + 1) * MICROCELLS_PER_STANDARD_EDGE;
  const minimumZ =
    region.minimum_z * MICROCELLS_PER_STANDARD_EDGE;
  const maximumZExclusive =
    (region.maximum_z + 1) * MICROCELLS_PER_STANDARD_EDGE;

  return (
    origin.x >= minimumX &&
    origin.y >= minimumY &&
    origin.z >= minimumZ &&
    origin.x + edgeMicrocells <= maximumXExclusive &&
    origin.y + edgeMicrocells <= maximumYExclusive &&
    origin.z + edgeMicrocells <= maximumZExclusive
  );
}

function validateWorldRegionBinding(
  manifest: VoidRealmsWorldManifestV1,
  region: VoidRealmsRegionDescriptorV1,
  worldId: string,
  regionId: string,
): void {
  requireString(worldId, "world_id", WORLD_ID);
  requireString(regionId, "region_id", REGION_ID);
  assertCondition(manifest.world_id === worldId, "manifest world mismatch");
  assertCondition(region.world_id === worldId, "region world mismatch");
  assertCondition(region.region_id === regionId, "region ID mismatch");
}

function placementOccupancySet(
  placements: readonly VoidRealmsTriScalePlacementV1[],
): Set<string> {
  const occupied = new Set<string>();
  for (const placement of placements) {
    const keys = enumeratePlacementMicrocellKeysV1(
      placement.origin_microcell,
      placement.edge_microcells,
    );
    assertCondition(
      keys.length === placement.volume_microcells,
      "placement volume mismatch",
    );
    for (const key of keys) {
      assertCondition(!occupied.has(key), "state contains overlapping placements");
      occupied.add(key);
    }
  }
  return occupied;
}

export async function occupancyRootForPlacementsV1(
  placements: readonly VoidRealmsTriScalePlacementV1[],
): Promise<string> {
  return cidForJson([...placementOccupancySet(placements)].sort());
}

async function stateBodyV1(input: {
  world_id: string;
  region_id: string;
  revision: number;
  material_units_by_id: Record<string, number>;
  placements: VoidRealmsTriScalePlacementV1[];
  consumed_request_ids: string[];
}): Promise<Omit<VoidRealmsTriScaleBuildStateV1, "state_root_sha256">> {
  requireString(input.world_id, "world_id", WORLD_ID);
  requireString(input.region_id, "region_id", REGION_ID);
  const revision = requireSafeInteger(input.revision, "revision", 0);
  const balances: Record<string, number> = {};
  for (const [materialId, units] of Object.entries(input.material_units_by_id)) {
    requireString(materialId, "material_id", MATERIAL_ID);
    balances[materialId] = requireSafeInteger(
      units,
      `material balance ${materialId}`,
      0,
    );
  }
  const placements = [...input.placements].sort((left, right) =>
    left.placement_id.localeCompare(right.placement_id),
  );
  for (const placement of placements) {
    requireString(placement.placement_id, "placement_id", PLACEMENT_ID);
    assertCondition(
      placement.world_id === input.world_id &&
        placement.region_id === input.region_id,
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
      "state contains misaligned placement",
    );
  }
  const requests = [...input.consumed_request_ids].sort();
  assertCondition(
    new Set(requests).size === requests.length,
    "consumed request IDs must be unique",
  );
  for (const requestId of requests) {
    requireString(requestId, "request_id", REQUEST_ID);
  }
  const occupancyRoot = await occupancyRootForPlacementsV1(placements);
  return {
    marker: VOID_REALMS_TRISCALE_STATE_MARKER,
    version: 1 as const,
    world_id: input.world_id,
    region_id: input.region_id,
    revision,
    material_units_by_id: sortedRecord(balances),
    placements,
    consumed_request_ids: requests,
    occupancy_root_sha256: occupancyRoot,
  };
}

export async function materializeVoidRealmsTriScaleBuildStateV1(input: {
  world_id: string;
  region_id: string;
  revision: number;
  material_units_by_id: Record<string, number>;
  placements: VoidRealmsTriScalePlacementV1[];
  consumed_request_ids: string[];
}): Promise<VoidRealmsTriScaleBuildStateV1> {
  const body = await stateBodyV1(input);
  return {
    ...body,
    state_root_sha256: await cidForJson(body),
  };
}

export async function emptyVoidRealmsTriScaleBuildStateV1(input: {
  world_id: string;
  region_id: string;
  material_units_by_id: Record<string, number>;
}): Promise<VoidRealmsTriScaleBuildStateV1> {
  return materializeVoidRealmsTriScaleBuildStateV1({
    ...input,
    revision: 0,
    placements: [],
    consumed_request_ids: [],
  });
}

export async function planVoidRealmsTriScalePlacementV1(input: {
  manifest: VoidRealmsWorldManifestV1;
  region: VoidRealmsRegionDescriptorV1;
  state: VoidRealmsTriScaleBuildStateV1;
  request: VoidRealmsTriScalePlaceRequestV1;
}): Promise<VoidRealmsTriScalePlacePlanV1> {
  const request = input.request;
  assertCondition(
    request.marker === VOID_REALMS_TRISCALE_PLACE_REQUEST_MARKER,
    "place request marker mismatch",
  );
  assertCondition(request.version === 1, "place request version mismatch");
  validateWorldRegionBinding(
    input.manifest,
    input.region,
    request.world_id,
    request.region_id,
  );
  assertCondition(
    input.state.world_id === request.world_id &&
      input.state.region_id === request.region_id,
    "state binding mismatch",
  );
  assertCondition(
    request.expected_revision === input.state.revision,
    "stale build revision",
  );
  requireString(
    request.player_session_id,
    "player_session_id",
    PLAYER_SESSION_ID,
  );
  const materialId = requireString(
    request.material_id,
    "material_id",
    MATERIAL_ID,
  );
  const nonce = requireString(
    request.request_nonce_hex,
    "request_nonce_hex",
    HEX_32,
  );
  const requestedAt = requireUtc(request.requested_at_utc, "requested_at_utc");
  const origin = validateVoidRealmsMicrocellPositionV1(
    request.origin_microcell,
  );
  const profile = voidRealmsScaleProfileFromSelectorV1(
    request.selector_value,
  );
  assertCondition(
    placementOriginIsAlignedV1(origin, profile.edge_microcells),
    `${profile.name} placement is not aligned to its ${profile.edge_microcells}-microcell grid`,
  );
  assertCondition(
    placementFitsRegionV1(
      input.region,
      origin,
      profile.edge_microcells,
    ),
    "placement crosses the region boundary",
  );
  const occupiedKeys = enumeratePlacementMicrocellKeysV1(
    origin,
    profile.edge_microcells,
  );
  const existingOccupancy = placementOccupancySet(input.state.placements);
  for (const key of occupiedKeys) {
    assertCondition(
      !existingOccupancy.has(key),
      `placement overlaps occupied microcell ${key}`,
    );
  }
  const materialBefore = input.state.material_units_by_id[materialId] ?? 0;
  assertCondition(
    materialBefore >= profile.material_units,
    "insufficient material units",
  );
  const requestBody = {
    marker: VOID_REALMS_TRISCALE_PLACE_REQUEST_MARKER,
    version: 1,
    world_id: request.world_id,
    region_id: request.region_id,
    player_session_id: request.player_session_id,
    material_id: materialId,
    selector_index: profile.selector_index,
    origin_microcell: origin,
    expected_revision: request.expected_revision,
    request_nonce_hex: nonce,
    requested_at_utc: requestedAt,
  };
  const requestId = `voidrtbr1_${await cidForJson(requestBody)}`;
  assertCondition(
    !input.state.consumed_request_ids.includes(requestId),
    "place request replay detected",
  );
  const placementBody = {
    world_id: request.world_id,
    region_id: request.region_id,
    owner_player_session_id: request.player_session_id,
    material_id: materialId,
    scale: profile.name,
    selector_index: profile.selector_index,
    origin_microcell: origin,
    edge_microcells: profile.edge_microcells,
    volume_microcells: profile.volume_microcells,
    material_units: profile.material_units,
    placed_at_utc: requestedAt,
    request_id: requestId,
  };
  const placement: VoidRealmsTriScalePlacementV1 = {
    placement_id: `voidrtb1_${await cidForJson(placementBody)}`,
    world_id: request.world_id,
    region_id: request.region_id,
    owner_player_session_id: request.player_session_id,
    material_id: materialId,
    scale: profile.name,
    selector_index: profile.selector_index,
    origin_microcell: origin,
    edge_microcells: profile.edge_microcells,
    volume_microcells: profile.volume_microcells,
    material_units: profile.material_units,
    placed_at_utc: requestedAt,
  };
  return {
    marker: VOID_REALMS_TRISCALE_PLACE_PLAN_MARKER,
    version: 1,
    request_id: requestId,
    status: "planned_requires_authoritative_commit",
    world_id: request.world_id,
    region_id: request.region_id,
    expected_revision: input.state.revision,
    next_revision: input.state.revision + 1,
    placement,
    occupied_microcell_keys: occupiedKeys,
    material_units_before: materialBefore,
    material_units_after: materialBefore - profile.material_units,
    client_material_cost_trusted: false,
    server_derived_material_cost: true,
    gameplay_state_committed: false,
  };
}

export async function simulateVoidRealmsTriScalePlacementV1(input: {
  state: VoidRealmsTriScaleBuildStateV1;
  plan: VoidRealmsTriScalePlacePlanV1;
}): Promise<{
  state: VoidRealmsTriScaleBuildStateV1;
  receipt: VoidRealmsTriScaleSimulationReceiptV1;
}> {
  assertCondition(
    input.plan.expected_revision === input.state.revision &&
      input.plan.next_revision === input.state.revision + 1,
    "place simulation revision mismatch",
  );
  assertCondition(
    !input.state.consumed_request_ids.includes(input.plan.request_id),
    "place simulation replay detected",
  );
  const balances = clone(input.state.material_units_by_id);
  balances[input.plan.placement.material_id] =
    input.plan.material_units_after;
  const nextState = await materializeVoidRealmsTriScaleBuildStateV1({
    world_id: input.state.world_id,
    region_id: input.state.region_id,
    revision: input.plan.next_revision,
    material_units_by_id: balances,
    placements: [...input.state.placements, input.plan.placement],
    consumed_request_ids: [
      ...input.state.consumed_request_ids,
      input.plan.request_id,
    ],
  });
  return {
    state: nextState,
    receipt: {
      marker: VOID_REALMS_TRISCALE_SIMULATION_RECEIPT_MARKER,
      version: 1,
      action: "place",
      request_id: input.plan.request_id,
      before_state_root_sha256: input.state.state_root_sha256,
      after_state_root_sha256: nextState.state_root_sha256,
      before_revision: input.state.revision,
      after_revision: nextState.revision,
      material_units_delta: -input.plan.placement.material_units,
      status: "simulated_not_committed",
      world_mutation: false,
      inventory_mutation: false,
      gameplay_state_committed: false,
    },
  };
}

export async function planVoidRealmsTriScaleBreakV1(input: {
  manifest: VoidRealmsWorldManifestV1;
  region: VoidRealmsRegionDescriptorV1;
  state: VoidRealmsTriScaleBuildStateV1;
  request: VoidRealmsTriScaleBreakRequestV1;
}): Promise<VoidRealmsTriScaleBreakPlanV1> {
  const request = input.request;
  assertCondition(
    request.marker === VOID_REALMS_TRISCALE_BREAK_REQUEST_MARKER,
    "break request marker mismatch",
  );
  assertCondition(request.version === 1, "break request version mismatch");
  validateWorldRegionBinding(
    input.manifest,
    input.region,
    request.world_id,
    request.region_id,
  );
  assertCondition(
    input.state.world_id === request.world_id &&
      input.state.region_id === request.region_id,
    "state binding mismatch",
  );
  assertCondition(
    request.expected_revision === input.state.revision,
    "stale build revision",
  );
  const playerSessionId = requireString(
    request.player_session_id,
    "player_session_id",
    PLAYER_SESSION_ID,
  );
  const placementId = requireString(
    request.placement_id,
    "placement_id",
    PLACEMENT_ID,
  );
  const placement = input.state.placements.find(
    (candidate) => candidate.placement_id === placementId,
  );
  assertCondition(placement !== undefined, "placement does not exist");
  assertCondition(
    placement.owner_player_session_id === playerSessionId,
    "v1 break request is not from the placement owner",
  );
  const nonce = requireString(
    request.request_nonce_hex,
    "request_nonce_hex",
    HEX_32,
  );
  const requestedAt = requireUtc(request.requested_at_utc, "requested_at_utc");
  const requestBody = {
    marker: VOID_REALMS_TRISCALE_BREAK_REQUEST_MARKER,
    version: 1,
    world_id: request.world_id,
    region_id: request.region_id,
    player_session_id: playerSessionId,
    placement_id: placementId,
    expected_revision: request.expected_revision,
    request_nonce_hex: nonce,
    requested_at_utc: requestedAt,
  };
  const requestId = `voidrtbr1_${await cidForJson(requestBody)}`;
  assertCondition(
    !input.state.consumed_request_ids.includes(requestId),
    "break request replay detected",
  );
  const materialBefore =
    input.state.material_units_by_id[placement.material_id] ?? 0;
  return {
    marker: VOID_REALMS_TRISCALE_BREAK_PLAN_MARKER,
    version: 1,
    request_id: requestId,
    status: "planned_requires_authoritative_commit",
    world_id: request.world_id,
    region_id: request.region_id,
    expected_revision: input.state.revision,
    next_revision: input.state.revision + 1,
    placement,
    released_microcell_keys: enumeratePlacementMicrocellKeysV1(
      placement.origin_microcell,
      placement.edge_microcells,
    ),
    material_units_before: materialBefore,
    material_units_after: materialBefore + placement.material_units,
    whole_piece_break_only: true,
    gameplay_state_committed: false,
  };
}

export async function simulateVoidRealmsTriScaleBreakV1(input: {
  state: VoidRealmsTriScaleBuildStateV1;
  plan: VoidRealmsTriScaleBreakPlanV1;
}): Promise<{
  state: VoidRealmsTriScaleBuildStateV1;
  receipt: VoidRealmsTriScaleSimulationReceiptV1;
}> {
  assertCondition(
    input.plan.expected_revision === input.state.revision &&
      input.plan.next_revision === input.state.revision + 1,
    "break simulation revision mismatch",
  );
  assertCondition(
    !input.state.consumed_request_ids.includes(input.plan.request_id),
    "break simulation replay detected",
  );
  const balances = clone(input.state.material_units_by_id);
  balances[input.plan.placement.material_id] =
    input.plan.material_units_after;
  const placements = input.state.placements.filter(
    (candidate) =>
      candidate.placement_id !== input.plan.placement.placement_id,
  );
  assertCondition(
    placements.length === input.state.placements.length - 1,
    "break simulation placement removal mismatch",
  );
  const nextState = await materializeVoidRealmsTriScaleBuildStateV1({
    world_id: input.state.world_id,
    region_id: input.state.region_id,
    revision: input.plan.next_revision,
    material_units_by_id: balances,
    placements,
    consumed_request_ids: [
      ...input.state.consumed_request_ids,
      input.plan.request_id,
    ],
  });
  return {
    state: nextState,
    receipt: {
      marker: VOID_REALMS_TRISCALE_SIMULATION_RECEIPT_MARKER,
      version: 1,
      action: "break",
      request_id: input.plan.request_id,
      before_state_root_sha256: input.state.state_root_sha256,
      after_state_root_sha256: nextState.state_root_sha256,
      before_revision: input.state.revision,
      after_revision: nextState.revision,
      material_units_delta: input.plan.placement.material_units,
      status: "simulated_not_committed",
      world_mutation: false,
      inventory_mutation: false,
      gameplay_state_committed: false,
    },
  };
}
