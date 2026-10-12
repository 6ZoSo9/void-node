import fs from "node:fs";

import {
  VOID_REALMS_SINGLE_WORLD_INPUT_MARKER,
  acceptVoidRealmsPlayerRegionHandoffV1,
  materializeVoidRealmsRegionAuthorityLeaseV1,
  materializeVoidRealmsRegionCheckpointV1,
  materializeVoidRealmsRegionDescriptorV1,
  materializeVoidRealmsReplicaAdvertisementV1,
  materializeVoidRealmsWorldCheckpointV1,
  materializeVoidRealmsWorldManifestV1,
  planVoidRealmsPlayerRegionHandoffV1,
  positionBelongsToRegionV1,
  regionCoordinatesForPositionV1,
  regionsAreAdjacentV1,
  validateVoidRealmsRegionCheckpointChainV1,
} from "../src/game/void_realms_single_canonical_world_region_checkpoint_handoff_v1.js";

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
  const examplePath =
    "examples/void-realms-single-canonical-world-region-checkpoint-handoff-v1.example.json";
  const schemaPath =
    "schemas/void-realms-single-canonical-world-region-checkpoint-handoff-v1.schema.json";
  const docsPath =
    "docs/architecture/void-realms-single-canonical-world-region-checkpoint-handoff-v1.md";
  const workflowPath =
    ".github/workflows/void-realms-single-canonical-world-region-checkpoint-handoff-v1.yml";
  const modPath = "integrations/luanti/void_realms_world/init.lua";

  const input = JSON.parse(fs.readFileSync(examplePath, "utf8")) as unknown;
  const manifest = await materializeVoidRealmsWorldManifestV1(input);
  const manifestAgain = await materializeVoidRealmsWorldManifestV1(input);

  assertCondition(
    manifest.world_id === manifestAgain.world_id,
    "world identity is not deterministic",
  );
  assertCondition(manifest.single_world_identity, "single world identity changed");
  assertCondition(
    manifest.status === "source_only_requires_genesis_authorization",
    "source-only world status changed",
  );

  const west = await materializeVoidRealmsRegionDescriptorV1(manifest, 0, 0);
  const east = await materializeVoidRealmsRegionDescriptorV1(manifest, 1, 0);
  const northEast = await materializeVoidRealmsRegionDescriptorV1(manifest, 1, 1);

  assertCondition(regionsAreAdjacentV1(west, east), "east region is not adjacent");
  assertCondition(
    !regionsAreAdjacentV1(west, northEast),
    "diagonal region was treated as adjacent",
  );
  assertCondition(
    JSON.stringify(regionCoordinatesForPositionV1(manifest, 1023, 100)) ===
      JSON.stringify({ region_x: 0, region_z: 0 }),
    "west boundary coordinate mismatch",
  );
  assertCondition(
    JSON.stringify(regionCoordinatesForPositionV1(manifest, 1024, 100)) ===
      JSON.stringify({ region_x: 1, region_z: 0 }),
    "east boundary coordinate mismatch",
  );
  assertCondition(
    JSON.stringify(regionCoordinatesForPositionV1(manifest, -1, -1)) ===
      JSON.stringify({ region_x: -1, region_z: -1 }),
    "negative coordinate floor mapping mismatch",
  );

  const westLease = await materializeVoidRealmsRegionAuthorityLeaseV1({
    world_id: manifest.world_id,
    region_id: west.region_id,
    authority_node_id: `voidnode1_${"1".repeat(64)}`,
    generation: 0,
    previous_lease_id: null,
    valid_from_utc: "2026-08-03T02:00:00Z",
    valid_until_utc: "2026-08-03T03:00:00Z",
  });
  const eastLease = await materializeVoidRealmsRegionAuthorityLeaseV1({
    world_id: manifest.world_id,
    region_id: east.region_id,
    authority_node_id: `voidnode1_${"2".repeat(64)}`,
    generation: 0,
    previous_lease_id: null,
    valid_from_utc: "2026-08-03T02:00:00Z",
    valid_until_utc: "2026-08-03T03:00:00Z",
  });

  const west0 = await materializeVoidRealmsRegionCheckpointV1({
    world_id: manifest.world_id,
    region_id: west.region_id,
    authority_lease: westLease,
    sequence: 0,
    tick: 1200,
    parent_checkpoint_id: null,
    state_root_sha256: "a".repeat(64),
    public_object_manifest_root_sha256: "b".repeat(64),
    event_log_root_sha256: "c".repeat(64),
    recorded_at_utc: "2026-08-03T02:10:00Z",
  });
  const west1 = await materializeVoidRealmsRegionCheckpointV1({
    world_id: manifest.world_id,
    region_id: west.region_id,
    authority_lease: westLease,
    sequence: 1,
    tick: 2400,
    parent_checkpoint_id: west0.checkpoint_id,
    state_root_sha256: "d".repeat(64),
    public_object_manifest_root_sha256: "e".repeat(64),
    event_log_root_sha256: "f".repeat(64),
    recorded_at_utc: "2026-08-03T02:20:00Z",
  });
  const east0 = await materializeVoidRealmsRegionCheckpointV1({
    world_id: manifest.world_id,
    region_id: east.region_id,
    authority_lease: eastLease,
    sequence: 0,
    tick: 2400,
    parent_checkpoint_id: null,
    state_root_sha256: "0".repeat(64),
    public_object_manifest_root_sha256: "1".repeat(64),
    event_log_root_sha256: "2".repeat(64),
    recorded_at_utc: "2026-08-03T02:20:00Z",
  });

  validateVoidRealmsRegionCheckpointChainV1([west0, west1]);

  const worldCheckpoint = await materializeVoidRealmsWorldCheckpointV1({
    world_id: manifest.world_id,
    epoch: 0,
    parent_world_checkpoint_id: null,
    region_checkpoints: [west1, east0],
    recorded_at_utc: "2026-08-03T02:20:05Z",
  });
  const worldCheckpointAgain = await materializeVoidRealmsWorldCheckpointV1({
    world_id: manifest.world_id,
    epoch: 0,
    parent_world_checkpoint_id: null,
    region_checkpoints: [east0, west1],
    recorded_at_utc: "2026-08-03T02:20:05Z",
  });
  assertCondition(
    worldCheckpoint.world_checkpoint_id ===
      worldCheckpointAgain.world_checkpoint_id,
    "world checkpoint region ordering is not deterministic",
  );

  const handoff = await planVoidRealmsPlayerRegionHandoffV1({
    manifest,
    world_checkpoint: worldCheckpoint,
    player_session_id: `voidrps1_${"3".repeat(64)}`,
    source_region: west,
    destination_region: east,
    source_checkpoint: west1,
    destination_checkpoint: east0,
    source_position: { x: 1023, y: 64, z: 100 },
    destination_position: { x: 1024, y: 64, z: 100 },
    player_public_state_root_sha256: "4".repeat(64),
    handoff_nonce_hex: "5".repeat(32),
    not_before_utc: "2026-08-03T02:20:10Z",
    expires_at_utc: "2026-08-03T02:20:40Z",
  });
  const receipt = await acceptVoidRealmsPlayerRegionHandoffV1({
    handoff,
    world_checkpoint: worldCheckpoint,
    destination_checkpoint: east0,
    accepted_at_utc: "2026-08-03T02:20:20Z",
  });

  assertCondition(
    handoff.raw_player_state_present === false,
    "handoff contains raw player state",
  );
  assertCondition(
    receipt.gameplay_state_committed === false,
    "source-only receipt committed gameplay state",
  );

  const replica = await materializeVoidRealmsReplicaAdvertisementV1({
    world_id: manifest.world_id,
    node_id: `voidnode1_${"6".repeat(64)}`,
    region_checkpoint_id: west1.checkpoint_id,
    public_object_roots_sha256: ["8".repeat(64), "7".repeat(64)],
    available_bytes: 1048576,
    recorded_at_utc: "2026-08-03T02:20:30Z",
  });
  assertCondition(replica.gameplay_authority === false, "replica gained gameplay authority");
  assertCondition(
    replica.checkpoint_signing_authority === false,
    "replica gained checkpoint signing authority",
  );
  assertCondition(
    replica.handoff_acceptance_authority === false,
    "replica gained handoff acceptance authority",
  );

  await expectReject("diagonal handoff", () =>
    planVoidRealmsPlayerRegionHandoffV1({
      manifest,
      world_checkpoint: worldCheckpoint,
      player_session_id: `voidrps1_${"3".repeat(64)}`,
      source_region: west,
      destination_region: northEast,
      source_checkpoint: west1,
      destination_checkpoint: east0,
      source_position: { x: 1023, y: 64, z: 1023 },
      destination_position: { x: 1024, y: 64, z: 1024 },
      player_public_state_root_sha256: "4".repeat(64),
      handoff_nonce_hex: "5".repeat(32),
      not_before_utc: "2026-08-03T02:20:10Z",
      expires_at_utc: "2026-08-03T02:20:40Z",
    }),
  );

  await expectReject("source position outside region", () =>
    planVoidRealmsPlayerRegionHandoffV1({
      manifest,
      world_checkpoint: worldCheckpoint,
      player_session_id: `voidrps1_${"3".repeat(64)}`,
      source_region: west,
      destination_region: east,
      source_checkpoint: west1,
      destination_checkpoint: east0,
      source_position: { x: 1024, y: 64, z: 100 },
      destination_position: { x: 1024, y: 64, z: 100 },
      player_public_state_root_sha256: "4".repeat(64),
      handoff_nonce_hex: "5".repeat(32),
      not_before_utc: "2026-08-03T02:20:10Z",
      expires_at_utc: "2026-08-03T02:20:40Z",
    }),
  );

  await expectReject("expired handoff", () =>
    acceptVoidRealmsPlayerRegionHandoffV1({
      handoff,
      world_checkpoint: worldCheckpoint,
      destination_checkpoint: east0,
      accepted_at_utc: "2026-08-03T02:20:41Z",
    }),
  );

  const badChain = clone(west1);
  badChain.parent_checkpoint_id = east0.checkpoint_id;
  await expectReject("wrong checkpoint parent", () =>
    validateVoidRealmsRegionCheckpointChainV1([west0, badChain]),
  );

  const duplicateRegionCheckpoint = clone(east0);
  duplicateRegionCheckpoint.region_id = west1.region_id;
  await expectReject("duplicate region in world checkpoint", () =>
    materializeVoidRealmsWorldCheckpointV1({
      world_id: manifest.world_id,
      epoch: 0,
      parent_world_checkpoint_id: null,
      region_checkpoints: [west1, duplicateRegionCheckpoint],
      recorded_at_utc: "2026-08-03T02:20:05Z",
    }),
  );

  const secondWorldInput = clone(
    JSON.parse(fs.readFileSync(examplePath, "utf8")) as {
      genesis_seed_sha256: string;
    },
  );
  secondWorldInput.genesis_seed_sha256 = "9".repeat(64);
  const secondWorld = await materializeVoidRealmsWorldManifestV1(secondWorldInput);
  assertCondition(
    secondWorld.world_id !== manifest.world_id,
    "different genesis produced the same world ID",
  );

  assertCondition(
    positionBelongsToRegionV1(west, 0, 64, 0),
    "region origin not recognized",
  );

  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8")) as {
    additionalProperties?: boolean;
    properties?: Record<string, unknown>;
  };
  assertCondition(schema.additionalProperties === false, "schema is not closed");

  const docs = fs.readFileSync(docsPath, "utf8");
  for (const fragment of [
    "one logical, persistent world",
    "many physical servers",
    "Replaceable authority servers",
    "Global world checkpoints",
    "two-phase handoff",
    "Player VOID Game Nodes",
    "VoidMiner",
    "Partial handoff validation produces no state commit",
  ]) {
    assertCondition(docs.includes(fragment), `docs missing: ${fragment}`);
  }

  const workflow = fs.readFileSync(workflowPath, "utf8");
  assertCondition(
    workflow.includes(
      "prove_void_realms_single_canonical_world_region_checkpoint_handoff_v1.ts",
    ),
    "workflow proof command missing",
  );
  assertCondition(!workflow.includes("\n  push:"), "workflow adds push trigger");

  const modSource = fs.readFileSync(modPath, "utf8");
  for (const required of [
    'core.register_chatcommand("voidworld"',
    "publish_sanitized_status",
    "gameplay_authority = false",
    "checkpoint_signing_authority = false",
    "handoff_acceptance_authority = false",
  ]) {
    assertCondition(modSource.includes(required), `Luanti mod missing: ${required}`);
  }
  for (const forbidden of [
    "core.request_http_api",
    "minetest.request_http_api",
    "io.open",
    "os.execute",
    "package.loadlib",
    "require(\"socket",
    "require('socket",
  ]) {
    assertCondition(
      !modSource.includes(forbidden),
      `Luanti mod contains forbidden authority: ${forbidden}`,
    );
  }

  assertCondition(
    VOID_REALMS_SINGLE_WORLD_INPUT_MARKER ===
      "VOID_REALMS_SINGLE_CANONICAL_WORLD_FOUNDATION_V1",
    "input marker changed",
  );

  console.log(`world_id=${manifest.world_id}`);
  console.log(`west_region_id=${west.region_id}`);
  console.log(`east_region_id=${east.region_id}`);
  console.log(`west_checkpoint_id=${west1.checkpoint_id}`);
  console.log(`east_checkpoint_id=${east0.checkpoint_id}`);
  console.log(`world_checkpoint_id=${worldCheckpoint.world_checkpoint_id}`);
  console.log(`handoff_id=${handoff.handoff_id}`);
  console.log(`handoff_receipt_id=${receipt.receipt_id}`);
  console.log(`replica_advertisement_id=${replica.advertisement_id}`);
  console.log("single_world_identity=true");
  console.log("many_physical_region_servers_allowed=true");
  console.log("region_servers_replaceable=true");
  console.log("global_checkpoint_anchor_required=true");
  console.log("handoff_requires_adjacent_regions=true");
  console.log("raw_player_state_present=false");
  console.log("player_node_gameplay_authority=false");
  console.log("checkpoint_signing=false");
  console.log("gameplay_state_commit=false");
  console.log("server_start=false");
  console.log("deployment=false");
  console.log("money_movement=false");
  console.log(
    "VOID_REALMS_SINGLE_CANONICAL_WORLD_REGION_CHECKPOINT_HANDOFF_V1_PROOF_GREEN=true",
  );
}

void main();
