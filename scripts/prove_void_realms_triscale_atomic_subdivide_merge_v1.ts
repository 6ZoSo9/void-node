import fs from "node:fs";

import {
  materializeVoidRealmsRegionDescriptorV1,
  materializeVoidRealmsWorldManifestV1,
} from "../src/game/void_realms_single_canonical_world_region_checkpoint_handoff_v1.js";
import {
  VOID_REALMS_TRISCALE_PLACE_REQUEST_MARKER,
  emptyVoidRealmsTriScaleBuildStateV1,
  planVoidRealmsTriScalePlacementV1,
  simulateVoidRealmsTriScalePlacementV1,
} from "../src/game/void_realms_triscale_building_v1.js";
import {
  VOID_REALMS_TRISCALE_MERGE_REQUEST_MARKER,
  VOID_REALMS_TRISCALE_SUBDIVIDE_REQUEST_MARKER,
  planVoidRealmsTriScaleMergeV1,
  planVoidRealmsTriScaleSubdivisionV1,
  simulateVoidRealmsTriScaleMergeV1,
  simulateVoidRealmsTriScaleSubdivisionV1,
} from "../src/game/void_realms_triscale_atomic_subdivide_merge_v1.js";

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

  const empty = await emptyVoidRealmsTriScaleBuildStateV1({
    world_id: manifest.world_id,
    region_id: region.region_id,
    material_units_by_id: { [materialId]: 256 },
  });
  const placeStandard = await planVoidRealmsTriScalePlacementV1({
    manifest,
    region,
    state: empty,
    request: {
      marker: VOID_REALMS_TRISCALE_PLACE_REQUEST_MARKER,
      version: 1,
      world_id: manifest.world_id,
      region_id: region.region_id,
      player_session_id: playerSessionId,
      material_id: materialId,
      selector_value: 2,
      origin_microcell: { x: 0, y: 0, z: 0 },
      expected_revision: empty.revision,
      request_nonce_hex: "1".repeat(32),
      requested_at_utc: "2026-08-03T14:40:00Z",
    },
  });
  const standardState = (
    await simulateVoidRealmsTriScalePlacementV1({
      state: empty,
      plan: placeStandard,
    })
  ).state;
  const baselineOccupancy = standardState.occupancy_root_sha256;
  const baselineBalance = standardState.material_units_by_id[materialId];

  const standardToMediumRequest = {
    marker: VOID_REALMS_TRISCALE_SUBDIVIDE_REQUEST_MARKER,
    version: 1 as const,
    world_id: manifest.world_id,
    region_id: region.region_id,
    player_session_id: playerSessionId,
    source_placement_id: placeStandard.placement.placement_id,
    target_scale: "medium" as const,
    expected_revision: standardState.revision,
    request_nonce_hex: "2".repeat(32),
    requested_at_utc: "2026-08-03T14:40:01Z",
  };
  const standardToMedium =
    await planVoidRealmsTriScaleSubdivisionV1({
      manifest,
      region,
      state: standardState,
      request: standardToMediumRequest,
    });
  assertCondition(
    standardToMedium.replacement_count === 8 &&
      standardToMedium.material_units_before === 64 &&
      standardToMedium.material_units_after === 64 &&
      standardToMedium.material_units_delta === 0 &&
      standardToMedium.occupancy_root_before === baselineOccupancy &&
      standardToMedium.occupancy_root_after === baselineOccupancy,
    "standard-to-medium plan mismatch",
  );
  const mediumApplied =
    await simulateVoidRealmsTriScaleSubdivisionV1({
      state: standardState,
      plan: standardToMedium,
    });
  assertCondition(
    mediumApplied.state.placements.length === 8 &&
      mediumApplied.state.placements.every(
        (placement) => placement.scale === "medium",
      ) &&
      mediumApplied.state.occupancy_root_sha256 === baselineOccupancy &&
      mediumApplied.state.material_units_by_id[materialId] === baselineBalance &&
      mediumApplied.receipt.material_units_delta === 0 &&
      mediumApplied.receipt.transient_overlap === false,
    "standard-to-medium simulation mismatch",
  );

  const replayState = clone(standardState);
  replayState.consumed_request_ids.push(standardToMedium.request_id);
  await expectReject("exact subdivision replay", () =>
    planVoidRealmsTriScaleSubdivisionV1({
      manifest,
      region,
      state: replayState,
      request: standardToMediumRequest,
    }),
  );

  await expectReject("subdivision wrong owner", () =>
    planVoidRealmsTriScaleSubdivisionV1({
      manifest,
      region,
      state: standardState,
      request: {
        ...standardToMediumRequest,
        player_session_id: `voidrps1_${"c".repeat(64)}`,
        request_nonce_hex: "3".repeat(32),
      },
    }),
  );

  await expectReject("subdivision stale revision", () =>
    planVoidRealmsTriScaleSubdivisionV1({
      manifest,
      region,
      state: standardState,
      request: {
        ...standardToMediumRequest,
        expected_revision: standardState.revision + 1,
        request_nonce_hex: "4".repeat(32),
      },
    }),
  );

  const mediumIds = mediumApplied.state.placements.map(
    (placement) => placement.placement_id,
  );
  await expectReject("partial medium merge", () =>
    planVoidRealmsTriScaleMergeV1({
      manifest,
      region,
      state: mediumApplied.state,
      request: {
        marker: VOID_REALMS_TRISCALE_MERGE_REQUEST_MARKER,
        version: 1,
        world_id: manifest.world_id,
        region_id: region.region_id,
        player_session_id: playerSessionId,
        source_placement_ids: mediumIds.slice(0, 7),
        target_scale: "standard",
        target_origin_microcell: { x: 0, y: 0, z: 0 },
        expected_revision: mediumApplied.state.revision,
        request_nonce_hex: "5".repeat(32),
        requested_at_utc: "2026-08-03T14:40:02Z",
      },
    }),
  );

  await expectReject("misaligned medium merge target", () =>
    planVoidRealmsTriScaleMergeV1({
      manifest,
      region,
      state: mediumApplied.state,
      request: {
        marker: VOID_REALMS_TRISCALE_MERGE_REQUEST_MARKER,
        version: 1,
        world_id: manifest.world_id,
        region_id: region.region_id,
        player_session_id: playerSessionId,
        source_placement_ids: mediumIds,
        target_scale: "standard",
        target_origin_microcell: { x: 1, y: 0, z: 0 },
        expected_revision: mediumApplied.state.revision,
        request_nonce_hex: "6".repeat(32),
        requested_at_utc: "2026-08-03T14:40:03Z",
      },
    }),
  );

  const mediumToStandard =
    await planVoidRealmsTriScaleMergeV1({
      manifest,
      region,
      state: mediumApplied.state,
      request: {
        marker: VOID_REALMS_TRISCALE_MERGE_REQUEST_MARKER,
        version: 1,
        world_id: manifest.world_id,
        region_id: region.region_id,
        player_session_id: playerSessionId,
        source_placement_ids: mediumIds,
        target_scale: "standard",
        target_origin_microcell: { x: 0, y: 0, z: 0 },
        expected_revision: mediumApplied.state.revision,
        request_nonce_hex: "7".repeat(32),
        requested_at_utc: "2026-08-03T14:40:04Z",
      },
    });
  assertCondition(
    mediumToStandard.source_count === 8 &&
      mediumToStandard.material_units_before === 64 &&
      mediumToStandard.material_units_after === 64 &&
      mediumToStandard.material_units_delta === 0,
    "medium-to-standard plan mismatch",
  );
  const standardRoundTrip =
    await simulateVoidRealmsTriScaleMergeV1({
      state: mediumApplied.state,
      plan: mediumToStandard,
    });
  assertCondition(
    standardRoundTrip.state.placements.length === 1 &&
      standardRoundTrip.state.placements[0].scale === "standard" &&
      standardRoundTrip.state.occupancy_root_sha256 === baselineOccupancy &&
      standardRoundTrip.state.material_units_by_id[materialId] ===
        baselineBalance,
    "medium-to-standard round trip mismatch",
  );

  const standardToSmall =
    await planVoidRealmsTriScaleSubdivisionV1({
      manifest,
      region,
      state: standardRoundTrip.state,
      request: {
        marker: VOID_REALMS_TRISCALE_SUBDIVIDE_REQUEST_MARKER,
        version: 1,
        world_id: manifest.world_id,
        region_id: region.region_id,
        player_session_id: playerSessionId,
        source_placement_id:
          standardRoundTrip.state.placements[0].placement_id,
        target_scale: "small",
        expected_revision: standardRoundTrip.state.revision,
        request_nonce_hex: "8".repeat(32),
        requested_at_utc: "2026-08-03T14:40:05Z",
      },
    });
  assertCondition(
    standardToSmall.replacement_count === 64 &&
      standardToSmall.material_units_after === 64,
    "standard-to-small plan mismatch",
  );
  const smallApplied =
    await simulateVoidRealmsTriScaleSubdivisionV1({
      state: standardRoundTrip.state,
      plan: standardToSmall,
    });
  assertCondition(
    smallApplied.state.placements.length === 64 &&
      smallApplied.state.placements.every(
        (placement) => placement.scale === "small",
      ) &&
      smallApplied.state.occupancy_root_sha256 === baselineOccupancy &&
      smallApplied.state.material_units_by_id[materialId] === baselineBalance,
    "standard-to-small simulation mismatch",
  );

  const smallIds = smallApplied.state.placements.map(
    (placement) => placement.placement_id,
  );
  const smallToStandard =
    await planVoidRealmsTriScaleMergeV1({
      manifest,
      region,
      state: smallApplied.state,
      request: {
        marker: VOID_REALMS_TRISCALE_MERGE_REQUEST_MARKER,
        version: 1,
        world_id: manifest.world_id,
        region_id: region.region_id,
        player_session_id: playerSessionId,
        source_placement_ids: smallIds,
        target_scale: "standard",
        target_origin_microcell: { x: 0, y: 0, z: 0 },
        expected_revision: smallApplied.state.revision,
        request_nonce_hex: "9".repeat(32),
        requested_at_utc: "2026-08-03T14:40:06Z",
      },
    });
  assertCondition(
    smallToStandard.source_count === 64 &&
      smallToStandard.material_units_delta === 0,
    "small-to-standard plan mismatch",
  );
  const standardFromSmall =
    await simulateVoidRealmsTriScaleMergeV1({
      state: smallApplied.state,
      plan: smallToStandard,
    });
  assertCondition(
    standardFromSmall.state.placements.length === 1 &&
      standardFromSmall.state.occupancy_root_sha256 === baselineOccupancy &&
      standardFromSmall.state.material_units_by_id[materialId] ===
        baselineBalance,
    "small-to-standard simulation mismatch",
  );

  const mediumAgain =
    await simulateVoidRealmsTriScaleSubdivisionV1({
      state: standardState,
      plan: standardToMedium,
    });
  const firstMedium = mediumAgain.state.placements.find(
    (placement) =>
      placement.origin_microcell.x === 0 &&
      placement.origin_microcell.y === 0 &&
      placement.origin_microcell.z === 0,
  );
  assertCondition(firstMedium !== undefined, "origin medium piece missing");

  const mediumToSmall =
    await planVoidRealmsTriScaleSubdivisionV1({
      manifest,
      region,
      state: mediumAgain.state,
      request: {
        marker: VOID_REALMS_TRISCALE_SUBDIVIDE_REQUEST_MARKER,
        version: 1,
        world_id: manifest.world_id,
        region_id: region.region_id,
        player_session_id: playerSessionId,
        source_placement_id: firstMedium.placement_id,
        target_scale: "small",
        expected_revision: mediumAgain.state.revision,
        request_nonce_hex: "a".repeat(32),
        requested_at_utc: "2026-08-03T14:40:07Z",
      },
    });
  assertCondition(
    mediumToSmall.replacement_count === 8 &&
      mediumToSmall.material_units_before === 8 &&
      mediumToSmall.material_units_after === 8,
    "medium-to-small plan mismatch",
  );
  const mixedState =
    await simulateVoidRealmsTriScaleSubdivisionV1({
      state: mediumAgain.state,
      plan: mediumToSmall,
    });
  assertCondition(
    mixedState.state.placements.length === 15 &&
      mixedState.state.placements.filter(
        (placement) => placement.scale === "medium",
      ).length === 7 &&
      mixedState.state.placements.filter(
        (placement) => placement.scale === "small",
      ).length === 8 &&
      mixedState.state.occupancy_root_sha256 === baselineOccupancy,
    "non-overlapping mixed-scale state mismatch",
  );

  await expectReject("mixed-scale merge", () =>
    planVoidRealmsTriScaleMergeV1({
      manifest,
      region,
      state: mixedState.state,
      request: {
        marker: VOID_REALMS_TRISCALE_MERGE_REQUEST_MARKER,
        version: 1,
        world_id: manifest.world_id,
        region_id: region.region_id,
        player_session_id: playerSessionId,
        source_placement_ids: mixedState.state.placements.map(
          (placement) => placement.placement_id,
        ),
        target_scale: "standard",
        target_origin_microcell: { x: 0, y: 0, z: 0 },
        expected_revision: mixedState.state.revision,
        request_nonce_hex: "b".repeat(32),
        requested_at_utc: "2026-08-03T14:40:08Z",
      },
    }),
  );

  const originSmallIds = mixedState.state.placements
    .filter((placement) => placement.scale === "small")
    .map((placement) => placement.placement_id);
  const smallToMedium =
    await planVoidRealmsTriScaleMergeV1({
      manifest,
      region,
      state: mixedState.state,
      request: {
        marker: VOID_REALMS_TRISCALE_MERGE_REQUEST_MARKER,
        version: 1,
        world_id: manifest.world_id,
        region_id: region.region_id,
        player_session_id: playerSessionId,
        source_placement_ids: originSmallIds,
        target_scale: "medium",
        target_origin_microcell: { x: 0, y: 0, z: 0 },
        expected_revision: mixedState.state.revision,
        request_nonce_hex: "c".repeat(32),
        requested_at_utc: "2026-08-03T14:40:09Z",
      },
    });
  assertCondition(
    smallToMedium.source_count === 8 &&
      smallToMedium.target_placement.material_units === 8,
    "small-to-medium plan mismatch",
  );
  const uniformMediumRestored =
    await simulateVoidRealmsTriScaleMergeV1({
      state: mixedState.state,
      plan: smallToMedium,
    });
  assertCondition(
    uniformMediumRestored.state.placements.length === 8 &&
      uniformMediumRestored.state.placements.every(
        (placement) => placement.scale === "medium",
      ) &&
      uniformMediumRestored.state.occupancy_root_sha256 === baselineOccupancy,
    "small-to-medium restoration mismatch",
  );

  const mixedMaterial = clone(mediumApplied.state);
  mixedMaterial.placements[0].material_id = `voidmat1_${"d".repeat(64)}`;
  await expectReject("mixed-material merge", () =>
    planVoidRealmsTriScaleMergeV1({
      manifest,
      region,
      state: mixedMaterial,
      request: {
        marker: VOID_REALMS_TRISCALE_MERGE_REQUEST_MARKER,
        version: 1,
        world_id: manifest.world_id,
        region_id: region.region_id,
        player_session_id: playerSessionId,
        source_placement_ids: mixedMaterial.placements.map(
          (placement) => placement.placement_id,
        ),
        target_scale: "standard",
        target_origin_microcell: { x: 0, y: 0, z: 0 },
        expected_revision: mixedMaterial.revision,
        request_nonce_hex: "d".repeat(32),
        requested_at_utc: "2026-08-03T14:40:10Z",
      },
    }),
  );

  await expectReject("duplicate merge source ID", () =>
    planVoidRealmsTriScaleMergeV1({
      manifest,
      region,
      state: mediumApplied.state,
      request: {
        marker: VOID_REALMS_TRISCALE_MERGE_REQUEST_MARKER,
        version: 1,
        world_id: manifest.world_id,
        region_id: region.region_id,
        player_session_id: playerSessionId,
        source_placement_ids: [...mediumIds.slice(0, 7), mediumIds[0]],
        target_scale: "standard",
        target_origin_microcell: { x: 0, y: 0, z: 0 },
        expected_revision: mediumApplied.state.revision,
        request_nonce_hex: "e".repeat(32),
        requested_at_utc: "2026-08-03T14:40:11Z",
      },
    }),
  );

  await expectReject("cross-region merge target", () =>
    planVoidRealmsTriScaleMergeV1({
      manifest,
      region,
      state: mediumApplied.state,
      request: {
        marker: VOID_REALMS_TRISCALE_MERGE_REQUEST_MARKER,
        version: 1,
        world_id: manifest.world_id,
        region_id: region.region_id,
        player_session_id: playerSessionId,
        source_placement_ids: mediumIds,
        target_scale: "standard",
        target_origin_microcell: {
          x: (region.maximum_x + 1) * 4,
          y: 0,
          z: 0,
        },
        expected_revision: mediumApplied.state.revision,
        request_nonce_hex: "f".repeat(32),
        requested_at_utc: "2026-08-03T14:40:12Z",
      },
    }),
  );

  const config = JSON.parse(
    fs.readFileSync(
      "examples/void-realms-triscale-atomic-subdivide-merge-v1.example.json",
      "utf8",
    ),
  ) as {
    atomic_policy: {
      material_units_delta: number;
      occupancy_root_must_remain_equal: boolean;
      transient_overlap_allowed: boolean;
    };
  };
  assertCondition(
    config.atomic_policy.material_units_delta === 0 &&
      config.atomic_policy.occupancy_root_must_remain_equal === true &&
      config.atomic_policy.transient_overlap_allowed === false,
    "checked-in atomic conversion policy changed",
  );

  const docs = fs.readFileSync(
    "docs/architecture/void-realms-triscale-atomic-subdivide-merge-v1.md",
    "utf8",
  );
  for (const fragment of [
    "standard → 8 medium",
    "standard → 64 small",
    "medium → 8 small",
    "There is no canonical intermediate state",
    "material delta",
    "preview-only",
  ]) {
    assertCondition(docs.includes(fragment), `docs missing: ${fragment}`);
  }

  const modSource = fs.readFileSync(
    "integrations/luanti/void_realms_triscale_convert/init.lua",
    "utf8",
  );
  for (const required of [
    "conversion_preview",
    "material_units_delta = 0",
    "occupancy_root_must_remain_equal = true",
    "transient_overlap = false",
    "world_mutation = false",
  ]) {
    assertCondition(modSource.includes(required), `mod missing: ${required}`);
  }
  for (const forbidden of [
    "set_node(",
    "add_node(",
    "swap_node(",
    "remove_node(",
    "bulk_set_node(",
    "set_stack(",
    "add_item(",
    "remove_item(",
    "io.open",
    "os.execute",
    "request_http_api",
  ]) {
    assertCondition(
      !modSource.includes(forbidden),
      `preview adapter contains forbidden action: ${forbidden}`,
    );
  }

  console.log(`world_id=${manifest.world_id}`);
  console.log(`region_id=${region.region_id}`);
  console.log(`baseline_occupancy_root=${baselineOccupancy}`);
  console.log("standard_to_medium_replacement_count=8");
  console.log("standard_to_small_replacement_count=64");
  console.log("medium_to_small_replacement_count=8");
  console.log("small_to_medium_source_count=8");
  console.log("small_to_standard_source_count=64");
  console.log("medium_to_standard_source_count=8");
  console.log("occupancy_root_preserved=true");
  console.log("material_units_delta=0");
  console.log("atomic_single_revision_transition=true");
  console.log("transient_overlap=false");
  console.log("mixed_source_scale_merge_allowed=false");
  console.log("partial_coverage_merge_allowed=false");
  console.log("cross_region_conversion_allowed=false");
  console.log("gameplay_state_commit=false");
  console.log("deployment=false");
  console.log("money_movement=false");
  console.log(
    "VOID_REALMS_TRISCALE_ATOMIC_SUBDIVIDE_MERGE_V1_PROOF_GREEN=true",
  );
}

void main();
