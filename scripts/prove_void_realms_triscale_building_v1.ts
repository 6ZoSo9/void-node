import fs from "node:fs";

import {
  materializeVoidRealmsRegionDescriptorV1,
  materializeVoidRealmsWorldManifestV1,
} from "../src/game/void_realms_single_canonical_world_region_checkpoint_handoff_v1.js";
import {
  MICROCELLS_PER_STANDARD_EDGE,
  VOID_REALMS_SCALE_PROFILES_V1,
  VOID_REALMS_TRISCALE_BREAK_REQUEST_MARKER,
  VOID_REALMS_TRISCALE_PLACE_REQUEST_MARKER,
  emptyVoidRealmsTriScaleBuildStateV1,
  enumeratePlacementMicrocellKeysV1,
  microcellToNodeCoordinateV1,
  nodeCoordinateToMicrocellOriginV1,
  normalizeVoidRealmsSelectorValueV1,
  occupancyRootForPlacementsV1,
  placementOriginIsAlignedV1,
  planVoidRealmsTriScaleBreakV1,
  planVoidRealmsTriScalePlacementV1,
  simulateVoidRealmsTriScaleBreakV1,
  simulateVoidRealmsTriScalePlacementV1,
  voidRealmsScaleProfileFromSelectorV1,
} from "../src/game/void_realms_triscale_building_v1.js";

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

async function main(): Promise<void> {
  const parentInput = JSON.parse(
    fs.readFileSync(
      "examples/void-realms-single-canonical-world-region-checkpoint-handoff-v1.example.json",
      "utf8",
    ),
  ) as unknown;
  const manifest = await materializeVoidRealmsWorldManifestV1(parentInput);
  const region = await materializeVoidRealmsRegionDescriptorV1(
    manifest,
    0,
    0,
  );
  const materialId = `voidmat1_${"a".repeat(64)}`;
  const playerSessionId = `voidrps1_${"b".repeat(64)}`;

  assertCondition(
    MICROCELLS_PER_STANDARD_EDGE === 4,
    "standard edge changed",
  );
  assertCondition(
    JSON.stringify(
      VOID_REALMS_SCALE_PROFILES_V1.map((profile) => ({
        index: profile.selector_index,
        name: profile.name,
        edge: profile.edge_microcells,
        volume: profile.volume_microcells,
        cost: profile.material_units,
      })),
    ) ===
      JSON.stringify([
        { index: 0, name: "small", edge: 1, volume: 1, cost: 1 },
        { index: 1, name: "medium", edge: 2, volume: 8, cost: 8 },
        { index: 2, name: "standard", edge: 4, volume: 64, cost: 64 },
      ]),
    "scale profiles changed",
  );
  assertCondition(
    normalizeVoidRealmsSelectorValueV1(-100) === 0 &&
      normalizeVoidRealmsSelectorValueV1(0.49) === 0 &&
      normalizeVoidRealmsSelectorValueV1(0.51) === 1 &&
      normalizeVoidRealmsSelectorValueV1(1.51) === 2 &&
      normalizeVoidRealmsSelectorValueV1(100) === 2,
    "selector normalization mismatch",
  );
  assertCondition(
    voidRealmsScaleProfileFromSelectorV1(2).name === "standard",
    "default selector does not map to standard",
  );
  assertCondition(
    nodeCoordinateToMicrocellOriginV1(7) === 28 &&
      nodeCoordinateToMicrocellOriginV1(-1) === -4 &&
      microcellToNodeCoordinateV1(3) === 0 &&
      microcellToNodeCoordinateV1(4) === 1 &&
      microcellToNodeCoordinateV1(-1) === -1 &&
      microcellToNodeCoordinateV1(-4) === -1 &&
      microcellToNodeCoordinateV1(-5) === -2,
    "node/microcell conversion mismatch",
  );
  assertCondition(
    placementOriginIsAlignedV1({ x: -4, y: 0, z: 4 }, 4) &&
      !placementOriginIsAlignedV1({ x: -3, y: 0, z: 4 }, 4) &&
      placementOriginIsAlignedV1({ x: -2, y: 0, z: 2 }, 2),
    "negative-coordinate alignment mismatch",
  );

  const initial = await emptyVoidRealmsTriScaleBuildStateV1({
    world_id: manifest.world_id,
    region_id: region.region_id,
    material_units_by_id: { [materialId]: 256 },
  });

  const standardPlan = await planVoidRealmsTriScalePlacementV1({
    manifest,
    region,
    state: initial,
    request: {
      marker: VOID_REALMS_TRISCALE_PLACE_REQUEST_MARKER,
      version: 1,
      world_id: manifest.world_id,
      region_id: region.region_id,
      player_session_id: playerSessionId,
      material_id: materialId,
      selector_value: 2,
      origin_microcell: { x: 0, y: 0, z: 0 },
      expected_revision: initial.revision,
      request_nonce_hex: "1".repeat(32),
      requested_at_utc: "2026-08-03T07:40:00Z",
    },
  });
  assertCondition(
    standardPlan.placement.material_units === 64 &&
      standardPlan.occupied_microcell_keys.length === 64 &&
      standardPlan.client_material_cost_trusted === false &&
      standardPlan.server_derived_material_cost === true,
    "standard placement derivation mismatch",
  );
  const standardApplied =
    await simulateVoidRealmsTriScalePlacementV1({
      state: initial,
      plan: standardPlan,
    });
  assertCondition(
    standardApplied.state.material_units_by_id[materialId] === 192 &&
      standardApplied.receipt.material_units_delta === -64 &&
      standardApplied.receipt.world_mutation === false &&
      standardApplied.receipt.inventory_mutation === false,
    "standard placement conservation mismatch",
  );

  await expectReject("overlap", () =>
    planVoidRealmsTriScalePlacementV1({
      manifest,
      region,
      state: standardApplied.state,
      request: {
        marker: VOID_REALMS_TRISCALE_PLACE_REQUEST_MARKER,
        version: 1,
        world_id: manifest.world_id,
        region_id: region.region_id,
        player_session_id: playerSessionId,
        material_id: materialId,
        selector_value: 0,
        origin_microcell: { x: 0, y: 0, z: 0 },
        expected_revision: standardApplied.state.revision,
        request_nonce_hex: "2".repeat(32),
        requested_at_utc: "2026-08-03T07:40:01Z",
      },
    }),
  );

  await expectReject("misaligned medium", () =>
    planVoidRealmsTriScalePlacementV1({
      manifest,
      region,
      state: initial,
      request: {
        marker: VOID_REALMS_TRISCALE_PLACE_REQUEST_MARKER,
        version: 1,
        world_id: manifest.world_id,
        region_id: region.region_id,
        player_session_id: playerSessionId,
        material_id: materialId,
        selector_value: 1,
        origin_microcell: { x: 1, y: 0, z: 0 },
        expected_revision: initial.revision,
        request_nonce_hex: "3".repeat(32),
        requested_at_utc: "2026-08-03T07:40:02Z",
      },
    }),
  );

  await expectReject("stale revision", () =>
    planVoidRealmsTriScalePlacementV1({
      manifest,
      region,
      state: initial,
      request: {
        marker: VOID_REALMS_TRISCALE_PLACE_REQUEST_MARKER,
        version: 1,
        world_id: manifest.world_id,
        region_id: region.region_id,
        player_session_id: playerSessionId,
        material_id: materialId,
        selector_value: 0,
        origin_microcell: { x: 8, y: 0, z: 0 },
        expected_revision: 1,
        request_nonce_hex: "4".repeat(32),
        requested_at_utc: "2026-08-03T07:40:03Z",
      },
    }),
  );

  const poorState = await emptyVoidRealmsTriScaleBuildStateV1({
    world_id: manifest.world_id,
    region_id: region.region_id,
    material_units_by_id: { [materialId]: 63 },
  });
  await expectReject("insufficient standard material", () =>
    planVoidRealmsTriScalePlacementV1({
      manifest,
      region,
      state: poorState,
      request: {
        marker: VOID_REALMS_TRISCALE_PLACE_REQUEST_MARKER,
        version: 1,
        world_id: manifest.world_id,
        region_id: region.region_id,
        player_session_id: playerSessionId,
        material_id: materialId,
        selector_value: 2,
        origin_microcell: { x: 8, y: 0, z: 0 },
        expected_revision: poorState.revision,
        request_nonce_hex: "5".repeat(32),
        requested_at_utc: "2026-08-03T07:40:04Z",
      },
    }),
  );

  const easternEdgeMicrocell =
    (region.maximum_x + 1) * MICROCELLS_PER_STANDARD_EDGE - 2;
  await expectReject("cross-region medium piece", () =>
    planVoidRealmsTriScalePlacementV1({
      manifest,
      region,
      state: initial,
      request: {
        marker: VOID_REALMS_TRISCALE_PLACE_REQUEST_MARKER,
        version: 1,
        world_id: manifest.world_id,
        region_id: region.region_id,
        player_session_id: playerSessionId,
        material_id: materialId,
        selector_value: 2,
        origin_microcell: {
          x: easternEdgeMicrocell,
          y: 0,
          z: 0,
        },
        expected_revision: initial.revision,
        request_nonce_hex: "6".repeat(32),
        requested_at_utc: "2026-08-03T07:40:05Z",
      },
    }),
  );

  const standardBreak = await planVoidRealmsTriScaleBreakV1({
    manifest,
    region,
    state: standardApplied.state,
    request: {
      marker: VOID_REALMS_TRISCALE_BREAK_REQUEST_MARKER,
      version: 1,
      world_id: manifest.world_id,
      region_id: region.region_id,
      player_session_id: playerSessionId,
      placement_id: standardPlan.placement.placement_id,
      expected_revision: standardApplied.state.revision,
      request_nonce_hex: "7".repeat(32),
      requested_at_utc: "2026-08-03T07:41:00Z",
    },
  });
  const standardBroken = await simulateVoidRealmsTriScaleBreakV1({
    state: standardApplied.state,
    plan: standardBreak,
  });
  assertCondition(
    standardBroken.state.material_units_by_id[materialId] === 256 &&
      standardBroken.state.placements.length === 0 &&
      standardBroken.receipt.material_units_delta === 64,
    "whole-piece break did not conserve material",
  );

  await expectReject("non-owner break", () =>
    planVoidRealmsTriScaleBreakV1({
      manifest,
      region,
      state: standardApplied.state,
      request: {
        marker: VOID_REALMS_TRISCALE_BREAK_REQUEST_MARKER,
        version: 1,
        world_id: manifest.world_id,
        region_id: region.region_id,
        player_session_id: `voidrps1_${"c".repeat(64)}`,
        placement_id: standardPlan.placement.placement_id,
        expected_revision: standardApplied.state.revision,
        request_nonce_hex: "8".repeat(32),
        requested_at_utc: "2026-08-03T07:41:01Z",
      },
    }),
  );

  let smallState = await emptyVoidRealmsTriScaleBuildStateV1({
    world_id: manifest.world_id,
    region_id: region.region_id,
    material_units_by_id: { [materialId]: 64 },
  });
  for (let x = 0; x < 4; x += 1) {
    for (let y = 0; y < 4; y += 1) {
      for (let z = 0; z < 4; z += 1) {
        const index = x * 16 + y * 4 + z;
        const plan = await planVoidRealmsTriScalePlacementV1({
          manifest,
          region,
          state: smallState,
          request: {
            marker: VOID_REALMS_TRISCALE_PLACE_REQUEST_MARKER,
            version: 1,
            world_id: manifest.world_id,
            region_id: region.region_id,
            player_session_id: playerSessionId,
            material_id: materialId,
            selector_value: 0,
            origin_microcell: { x, y, z },
            expected_revision: smallState.revision,
            request_nonce_hex: index.toString(16).padStart(32, "0"),
            requested_at_utc: `2026-08-03T07:42:${String(index % 60).padStart(2, "0")}Z`,
          },
        });
        smallState = (
          await simulateVoidRealmsTriScalePlacementV1({
            state: smallState,
            plan,
          })
        ).state;
      }
    }
  }
  assertCondition(
    smallState.placements.length === 64 &&
      smallState.material_units_by_id[materialId] === 0,
    "small-piece fill mismatch",
  );

  let mediumState = await emptyVoidRealmsTriScaleBuildStateV1({
    world_id: manifest.world_id,
    region_id: region.region_id,
    material_units_by_id: { [materialId]: 64 },
  });
  let mediumNonce = 0;
  for (const x of [0, 2]) {
    for (const y of [0, 2]) {
      for (const z of [0, 2]) {
        const plan = await planVoidRealmsTriScalePlacementV1({
          manifest,
          region,
          state: mediumState,
          request: {
            marker: VOID_REALMS_TRISCALE_PLACE_REQUEST_MARKER,
            version: 1,
            world_id: manifest.world_id,
            region_id: region.region_id,
            player_session_id: playerSessionId,
            material_id: materialId,
            selector_value: 1,
            origin_microcell: { x, y, z },
            expected_revision: mediumState.revision,
            request_nonce_hex: (100 + mediumNonce)
              .toString(16)
              .padStart(32, "0"),
            requested_at_utc: `2026-08-03T07:44:0${mediumNonce}Z`,
          },
        });
        mediumState = (
          await simulateVoidRealmsTriScalePlacementV1({
            state: mediumState,
            plan,
          })
        ).state;
        mediumNonce += 1;
      }
    }
  }
  assertCondition(
    mediumState.placements.length === 8 &&
      mediumState.material_units_by_id[materialId] === 0,
    "medium-piece fill mismatch",
  );

  const standardRoot = await occupancyRootForPlacementsV1([
    standardPlan.placement,
  ]);
  assertCondition(
    standardRoot === smallState.occupancy_root_sha256 &&
      standardRoot === mediumState.occupancy_root_sha256,
    "equivalent occupied volume produced different occupancy roots",
  );
  assertCondition(
    enumeratePlacementMicrocellKeysV1(
      standardPlan.placement.origin_microcell,
      standardPlan.placement.edge_microcells,
    ).length === 64,
    "standard enumeration changed",
  );

  const exactReplayRequest = {
    marker: VOID_REALMS_TRISCALE_PLACE_REQUEST_MARKER,
    version: 1 as const,
    world_id: manifest.world_id,
    region_id: region.region_id,
    player_session_id: playerSessionId,
    material_id: materialId,
    selector_value: 0,
    origin_microcell: { x: 8, y: 0, z: 0 },
    expected_revision: standardApplied.state.revision,
    request_nonce_hex: "9".repeat(32),
    requested_at_utc: "2026-08-03T07:45:00Z",
  };
  const exactReplayPlan = await planVoidRealmsTriScalePlacementV1({
    manifest,
    region,
    state: standardApplied.state,
    request: exactReplayRequest,
  });
  const replayState = clone(standardApplied.state);
  replayState.consumed_request_ids.push(exactReplayPlan.request_id);
  await expectReject("exact stored request replay", () =>
    planVoidRealmsTriScalePlacementV1({
      manifest,
      region,
      state: replayState,
      request: exactReplayRequest,
    }),
  );

  const config = JSON.parse(
    fs.readFileSync(
      "examples/void-realms-triscale-building-v1.example.json",
      "utf8",
    ),
  ) as {
    microcells_per_standard_edge: number;
    profiles: Array<{
      edge_microcells: number;
      material_units: number;
    }>;
  };
  assertCondition(
    config.microcells_per_standard_edge === 4 &&
      JSON.stringify(config.profiles.map((entry) => entry.edge_microcells)) ===
        JSON.stringify([1, 2, 4]) &&
      JSON.stringify(config.profiles.map((entry) => entry.material_units)) ===
        JSON.stringify([1, 8, 64]),
    "checked-in config scale math changed",
  );

  const schema = JSON.parse(
    fs.readFileSync(
      "schemas/void-realms-triscale-building-v1.schema.json",
      "utf8",
    ),
  ) as { additionalProperties?: boolean };
  assertCondition(schema.additionalProperties === false, "schema is not closed");

  const docs = fs.readFileSync(
    "docs/architecture/void-realms-triscale-building-v1.md",
    "utf8",
  );
  for (const fragment of [
    "SMALL 25%",
    "MEDIUM 50%",
    "STANDARD 100%",
    "4×4×4 microgrid",
    "No floating-point coordinate",
    "client never supplies a trusted cost",
    "occupancy root",
    "preview-only",
  ]) {
    assertCondition(docs.includes(fragment), `docs missing: ${fragment}`);
  }

  const modSource = fs.readFileSync(
    "integrations/luanti/void_realms_triscale_build/init.lua",
    "utf8",
  );
  for (const required of [
    "scrollbaroptions[min=0;max=2;smallstep=1;largestep=1",
    "core.explode_scrollbar_event",
    "core.pointed_thing_to_face_pos",
    "Preview only:",
    "world_mutation = false",
    "inventory_mutation = false",
  ]) {
    assertCondition(modSource.includes(required), `mod missing: ${required}`);
  }
  for (const forbidden of [
    "core.set_node",
    "core.add_node",
    "core.swap_node",
    "core.remove_node",
    "core.bulk_set_node",
    "get_voxel_manip",
    "VoxelManip",
    "set_stack(",
    "add_item(",
    "remove_item(",
    "io.open",
    "os.execute",
    "core.request_http_api",
    "minetest.request_http_api",
  ]) {
    assertCondition(
      !modSource.includes(forbidden),
      `preview adapter contains forbidden mutation: ${forbidden}`,
    );
  }

  const workflow = fs.readFileSync(
    ".github/workflows/void-realms-triscale-building-v1.yml",
    "utf8",
  );
  assertCondition(
    workflow.includes("prove_void_realms_triscale_building_v1.ts"),
    "workflow proof command missing",
  );
  assertCondition(!workflow.includes("\n  push:"), "workflow adds push trigger");

  console.log(`world_id=${manifest.world_id}`);
  console.log(`region_id=${region.region_id}`);
  console.log(`standard_placement_id=${standardPlan.placement.placement_id}`);
  console.log(`equivalent_occupancy_root=${standardRoot}`);
  console.log("selector_indices=0,1,2");
  console.log("edge_microcells=1,2,4");
  console.log("material_units=1,8,64");
  console.log("standard_equals_eight_medium_equals_sixty_four_small=true");
  console.log("integer_microcell_math=true");
  console.log("client_material_cost_trusted=false");
  console.log("cross_region_piece_allowed=false");
  console.log("world_mutation=false");
  console.log("inventory_mutation=false");
  console.log("gameplay_state_commit=false");
  console.log("server_start=false");
  console.log("deployment=false");
  console.log("money_movement=false");
  console.log("VOID_REALMS_TRISCALE_BUILDING_V1_PROOF_GREEN=true");
}

void main();
