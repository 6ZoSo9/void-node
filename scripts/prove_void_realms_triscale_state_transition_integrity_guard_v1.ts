import fs from "node:fs";

import { cidForJson } from "../src/util/cid.js";
import {
  materializeVoidRealmsRegionDescriptorV1,
  materializeVoidRealmsWorldManifestV1,
} from "../src/game/void_realms_single_canonical_world_region_checkpoint_handoff_v1.js";
import {
  VOID_REALMS_TRISCALE_BREAK_REQUEST_MARKER,
  VOID_REALMS_TRISCALE_PLACE_REQUEST_MARKER,
  VOID_REALMS_TRISCALE_STATE_MARKER,
  emptyVoidRealmsTriScaleBuildStateV1,
  occupancyRootForPlacementsV1,
  planVoidRealmsTriScaleBreakV1,
  planVoidRealmsTriScalePlacementV1,
  simulateVoidRealmsTriScaleBreakV1,
  simulateVoidRealmsTriScalePlacementV1,
  type VoidRealmsTriScaleBuildStateV1,
} from "../src/game/void_realms_triscale_building_v1.js";
import {
  VOID_REALMS_TRISCALE_MERGE_REQUEST_MARKER,
  VOID_REALMS_TRISCALE_SUBDIVIDE_REQUEST_MARKER,
  planVoidRealmsTriScaleMergeV1,
  planVoidRealmsTriScaleSubdivisionV1,
  simulateVoidRealmsTriScaleMergeV1,
  simulateVoidRealmsTriScaleSubdivisionV1,
} from "../src/game/void_realms_triscale_atomic_subdivide_merge_v1.js";
import {
  verifyVoidRealmsTriScaleBreakTransitionIntegrityV1,
  verifyVoidRealmsTriScaleBuildStateIntegrityV1,
  verifyVoidRealmsTriScaleMergeTransitionIntegrityV1,
  verifyVoidRealmsTriScalePlaceTransitionIntegrityV1,
  verifyVoidRealmsTriScaleSubdivisionTransitionIntegrityV1,
} from "../src/game/void_realms_triscale_state_transition_integrity_guard_v1.js";

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function expectReject(
  label: string,
  operation: () => Promise<unknown> | unknown,
): Promise<void> {
  try {
    await operation();
  } catch {
    return;
  }
  throw new Error(`expected rejection: ${label}`);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function readdressStateInCurrentOrder(
  state: VoidRealmsTriScaleBuildStateV1,
): Promise<VoidRealmsTriScaleBuildStateV1> {
  state.occupancy_root_sha256 = await occupancyRootForPlacementsV1(
    state.placements,
  );
  const body = {
    marker: VOID_REALMS_TRISCALE_STATE_MARKER,
    version: 1 as const,
    world_id: state.world_id,
    region_id: state.region_id,
    revision: state.revision,
    material_units_by_id: state.material_units_by_id,
    placements: state.placements,
    consumed_request_ids: state.consumed_request_ids,
    occupancy_root_sha256: state.occupancy_root_sha256,
  };
  state.state_root_sha256 = await cidForJson(body);
  return state;
}

async function main(): Promise<void> {
  const parentInput = JSON.parse(
    fs.readFileSync(
      "examples/void-realms-single-canonical-world-region-checkpoint-handoff-v1.example.json",
      "utf8",
    ),
  ) as unknown;
  const manifest = await materializeVoidRealmsWorldManifestV1(parentInput);
  const region = await materializeVoidRealmsRegionDescriptorV1(manifest, 0, 0);
  const materialId = `voidmat1_${"a".repeat(64)}`;
  const playerSessionId = `voidrps1_${"b".repeat(64)}`;

  const initial = await emptyVoidRealmsTriScaleBuildStateV1({
    world_id: manifest.world_id,
    region_id: region.region_id,
    material_units_by_id: { [materialId]: 128 },
  });
  const initialVerification =
    await verifyVoidRealmsTriScaleBuildStateIntegrityV1(initial, region);
  assertCondition(
    initialVerification.verified &&
      initialVerification.deterministic_utf16_ordering,
    "initial build state did not verify",
  );

  const placeRequest = {
    marker: VOID_REALMS_TRISCALE_PLACE_REQUEST_MARKER,
    version: 1 as const,
    world_id: manifest.world_id,
    region_id: region.region_id,
    player_session_id: playerSessionId,
    material_id: materialId,
    selector_value: 2,
    origin_microcell: { x: 0, y: 0, z: 0 },
    expected_revision: initial.revision,
    request_nonce_hex: "1".repeat(32),
    requested_at_utc: "2026-08-04T19:00:00Z",
  };
  const placePlan = await planVoidRealmsTriScalePlacementV1({
    manifest,
    region,
    state: initial,
    request: placeRequest,
  });
  const placeResult = await simulateVoidRealmsTriScalePlacementV1({
    state: initial,
    plan: placePlan,
  });
  const placeVerification =
    await verifyVoidRealmsTriScalePlaceTransitionIntegrityV1({
      manifest,
      region,
      before_state: initial,
      request: placeRequest,
      plan: placePlan,
      after_state: placeResult.state,
      receipt: placeResult.receipt,
    });
  assertCondition(
    placeVerification.action === "place" &&
      placeVerification.material_units_delta === -64,
    "valid place transition did not verify",
  );

  const breakRequest = {
    marker: VOID_REALMS_TRISCALE_BREAK_REQUEST_MARKER,
    version: 1 as const,
    world_id: manifest.world_id,
    region_id: region.region_id,
    player_session_id: playerSessionId,
    placement_id: placePlan.placement.placement_id,
    expected_revision: placeResult.state.revision,
    request_nonce_hex: "2".repeat(32),
    requested_at_utc: "2026-08-04T19:00:01Z",
  };
  const breakPlan = await planVoidRealmsTriScaleBreakV1({
    manifest,
    region,
    state: placeResult.state,
    request: breakRequest,
  });
  const breakResult = await simulateVoidRealmsTriScaleBreakV1({
    state: placeResult.state,
    plan: breakPlan,
  });
  const breakVerification =
    await verifyVoidRealmsTriScaleBreakTransitionIntegrityV1({
      manifest,
      region,
      before_state: placeResult.state,
      request: breakRequest,
      plan: breakPlan,
      after_state: breakResult.state,
      receipt: breakResult.receipt,
    });
  assertCondition(
    breakVerification.action === "break" &&
      breakVerification.material_units_delta === 64,
    "valid break transition did not verify",
  );

  const subdivisionRequest = {
    marker: VOID_REALMS_TRISCALE_SUBDIVIDE_REQUEST_MARKER,
    version: 1 as const,
    world_id: manifest.world_id,
    region_id: region.region_id,
    player_session_id: playerSessionId,
    source_placement_id: placePlan.placement.placement_id,
    target_scale: "medium" as const,
    expected_revision: placeResult.state.revision,
    request_nonce_hex: "3".repeat(32),
    requested_at_utc: "2026-08-04T19:00:02Z",
  };
  const subdivisionPlan = await planVoidRealmsTriScaleSubdivisionV1({
    manifest,
    region,
    state: placeResult.state,
    request: subdivisionRequest,
  });
  const subdivisionResult = await simulateVoidRealmsTriScaleSubdivisionV1({
    state: placeResult.state,
    plan: subdivisionPlan,
  });
  const subdivisionVerification =
    await verifyVoidRealmsTriScaleSubdivisionTransitionIntegrityV1({
      manifest,
      region,
      before_state: placeResult.state,
      request: subdivisionRequest,
      plan: subdivisionPlan,
      after_state: subdivisionResult.state,
      receipt: subdivisionResult.receipt,
    });
  assertCondition(
    subdivisionVerification.action === "subdivide" &&
      subdivisionVerification.material_units_delta === 0 &&
      subdivisionVerification.occupancy_root_before ===
        subdivisionVerification.occupancy_root_after,
    "valid subdivision transition did not verify",
  );

  const mergeRequest = {
    marker: VOID_REALMS_TRISCALE_MERGE_REQUEST_MARKER,
    version: 1 as const,
    world_id: manifest.world_id,
    region_id: region.region_id,
    player_session_id: playerSessionId,
    source_placement_ids: subdivisionPlan.replacement_placements.map(
      (placement) => placement.placement_id,
    ),
    target_scale: "standard" as const,
    target_origin_microcell: { x: 0, y: 0, z: 0 },
    expected_revision: subdivisionResult.state.revision,
    request_nonce_hex: "4".repeat(32),
    requested_at_utc: "2026-08-04T19:00:03Z",
  };
  const mergePlan = await planVoidRealmsTriScaleMergeV1({
    manifest,
    region,
    state: subdivisionResult.state,
    request: mergeRequest,
  });
  const mergeResult = await simulateVoidRealmsTriScaleMergeV1({
    state: subdivisionResult.state,
    plan: mergePlan,
  });
  const mergeVerification =
    await verifyVoidRealmsTriScaleMergeTransitionIntegrityV1({
      manifest,
      region,
      before_state: subdivisionResult.state,
      request: mergeRequest,
      plan: mergePlan,
      after_state: mergeResult.state,
      receipt: mergeResult.receipt,
    });
  assertCondition(
    mergeVerification.action === "merge" &&
      mergeVerification.material_units_delta === 0 &&
      mergeVerification.occupancy_root_before ===
        mergeVerification.occupancy_root_after,
    "valid merge transition did not verify",
  );

  const inflatedBalance = clone(initial);
  inflatedBalance.material_units_by_id[materialId] += 64;
  await expectReject("old-root balance inflation", () =>
    verifyVoidRealmsTriScaleBuildStateIntegrityV1(inflatedBalance, region),
  );

  const consumedRequestTampering = clone(initial);
  consumedRequestTampering.consumed_request_ids.push(
    `voidrtbr1_${"c".repeat(64)}`,
  );
  await expectReject("old-root consumed request mutation", () =>
    verifyVoidRealmsTriScaleBuildStateIntegrityV1(
      consumedRequestTampering,
      region,
    ),
  );

  const occupancyRootTampering = clone(placeResult.state);
  occupancyRootTampering.occupancy_root_sha256 = "d".repeat(64);
  await expectReject("occupancy root substitution", () =>
    verifyVoidRealmsTriScaleBuildStateIntegrityV1(
      occupancyRootTampering,
      region,
    ),
  );

  const stateRootTampering = clone(placeResult.state);
  stateRootTampering.state_root_sha256 = "e".repeat(64);
  await expectReject("state root substitution", () =>
    verifyVoidRealmsTriScaleBuildStateIntegrityV1(stateRootTampering, region),
  );

  const ownerTampering = clone(placeResult.state);
  ownerTampering.placements[0].owner_player_session_id =
    `voidrps1_${"c".repeat(64)}`;
  await expectReject("old-root placement owner mutation", () =>
    verifyVoidRealmsTriScaleBuildStateIntegrityV1(ownerTampering, region),
  );

  const reorderedState = clone(subdivisionResult.state);
  reorderedState.placements.reverse();
  await readdressStateInCurrentOrder(reorderedState);
  await expectReject("readdressed noncanonical placement ordering", () =>
    verifyVoidRealmsTriScaleBuildStateIntegrityV1(reorderedState, region),
  );

  const forgedPlacePlan = clone(placePlan);
  forgedPlacePlan.material_units_after += 1;
  await expectReject("forged place plan", () =>
    verifyVoidRealmsTriScalePlaceTransitionIntegrityV1({
      manifest,
      region,
      before_state: initial,
      request: placeRequest,
      plan: forgedPlacePlan,
      after_state: placeResult.state,
      receipt: placeResult.receipt,
    }),
  );

  const forgedBreakPlan = clone(breakPlan);
  forgedBreakPlan.material_units_after += 1;
  await expectReject("forged break plan", () =>
    verifyVoidRealmsTriScaleBreakTransitionIntegrityV1({
      manifest,
      region,
      before_state: placeResult.state,
      request: breakRequest,
      plan: forgedBreakPlan,
      after_state: breakResult.state,
      receipt: breakResult.receipt,
    }),
  );

  const forgedSubdivisionPlan = clone(subdivisionPlan);
  forgedSubdivisionPlan.replacement_placements[0].origin_microcell.x += 2;
  await expectReject("forged subdivision replacement", () =>
    verifyVoidRealmsTriScaleSubdivisionTransitionIntegrityV1({
      manifest,
      region,
      before_state: placeResult.state,
      request: subdivisionRequest,
      plan: forgedSubdivisionPlan,
      after_state: subdivisionResult.state,
      receipt: subdivisionResult.receipt,
    }),
  );

  const forgedMergePlan = clone(mergePlan);
  forgedMergePlan.target_placement.material_units = 1;
  await expectReject("forged merge target", () =>
    verifyVoidRealmsTriScaleMergeTransitionIntegrityV1({
      manifest,
      region,
      before_state: subdivisionResult.state,
      request: mergeRequest,
      plan: forgedMergePlan,
      after_state: mergeResult.state,
      receipt: mergeResult.receipt,
    }),
  );

  const forgedAfterState = clone(placeResult.state);
  forgedAfterState.material_units_by_id[materialId] += 1;
  await expectReject("forged after state", () =>
    verifyVoidRealmsTriScalePlaceTransitionIntegrityV1({
      manifest,
      region,
      before_state: initial,
      request: placeRequest,
      plan: placePlan,
      after_state: forgedAfterState,
      receipt: placeResult.receipt,
    }),
  );

  const forgedReceipt = clone(placeResult.receipt);
  forgedReceipt.material_units_delta += 1;
  await expectReject("forged receipt", () =>
    verifyVoidRealmsTriScalePlaceTransitionIntegrityV1({
      manifest,
      region,
      before_state: initial,
      request: placeRequest,
      plan: placePlan,
      after_state: placeResult.state,
      receipt: forgedReceipt,
    }),
  );

  const extraRequestKey = clone(placeRequest) as typeof placeRequest & {
    client_material_cost?: number;
  };
  extraRequestKey.client_material_cost = 1;
  await expectReject("unknown place request key", () =>
    verifyVoidRealmsTriScalePlaceTransitionIntegrityV1({
      manifest,
      region,
      before_state: initial,
      request: extraRequestKey,
      plan: placePlan,
      after_state: placeResult.state,
      receipt: placeResult.receipt,
    }),
  );

  const guardSource = fs.readFileSync(
    "src/game/void_realms_triscale_state_transition_integrity_guard_v1.ts",
    "utf8",
  );
  assertCondition(
    !guardSource.includes("localeCompare") &&
      !guardSource.includes("Intl.Collator"),
    "integrity guard uses locale-dependent ordering",
  );

  console.log(`world_id=${manifest.world_id}`);
  console.log(`region_id=${region.region_id}`);
  console.log(`place_request_id=${placePlan.request_id}`);
  console.log(`break_request_id=${breakPlan.request_id}`);
  console.log(`subdivide_request_id=${subdivisionPlan.request_id}`);
  console.log(`merge_request_id=${mergePlan.request_id}`);
  console.log("valid_transition_types=place,break,subdivide,merge");
  console.log("state_root_recomputed=true");
  console.log("occupancy_root_recomputed=true");
  console.log("plan_reconstructed_exactly=true");
  console.log("after_state_reconstructed_exactly=true");
  console.log("receipt_reconstructed_exactly=true");
  console.log("deterministic_utf16_ordering=true");
  console.log("world_mutation=false");
  console.log("inventory_mutation=false");
  console.log("gameplay_state_committed=false");
  console.log("deployment_performed=false");
  console.log("work_credit_write_performed=false");
  console.log("wallet_or_signer_access_performed=false");
  console.log("payment_execution_performed=false");
  console.log("fund_movement_performed=false");
  console.log(
    "VOID_REALMS_TRISCALE_STATE_TRANSITION_INTEGRITY_GUARD_V1_PROOF_GREEN",
  );
}

await main();
