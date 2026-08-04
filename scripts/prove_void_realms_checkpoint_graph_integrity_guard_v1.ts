import fs from "node:fs";

import {
  VOID_REALMS_SINGLE_WORLD_INPUT_MARKER,
  materializeVoidRealmsRegionAuthorityLeaseV1,
  materializeVoidRealmsRegionCheckpointV1,
  materializeVoidRealmsRegionDescriptorV1,
  materializeVoidRealmsWorldCheckpointV1,
  materializeVoidRealmsWorldManifestV1,
} from "../src/game/void_realms_single_canonical_world_region_checkpoint_handoff_v1.js";
import {
  VOID_REALMS_CHECKPOINT_GRAPH_INTEGRITY_GUARD_MARKER,
  acceptVoidRealmsPlayerRegionHandoffWithVerifiedCheckpointGraphV1,
  planVoidRealmsPlayerRegionHandoffWithVerifiedCheckpointGraphV1,
  verifyVoidRealmsCheckpointGraphV1,
} from "../src/game/void_realms_checkpoint_graph_integrity_guard_v1.js";
import type { VoidRealmsCheckpointGraphV1 } from "../src/game/void_realms_checkpoint_graph_integrity_guard_v1.js";

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
  const input = JSON.parse(
    fs.readFileSync(
      "examples/void-realms-single-canonical-world-region-checkpoint-handoff-v1.example.json",
      "utf8",
    ),
  ) as unknown;
  const manifest = await materializeVoidRealmsWorldManifestV1(input);
  const west = await materializeVoidRealmsRegionDescriptorV1(manifest, 0, 0);
  const east = await materializeVoidRealmsRegionDescriptorV1(manifest, 1, 0);
  const north = await materializeVoidRealmsRegionDescriptorV1(manifest, 0, 1);

  const westLease = await materializeVoidRealmsRegionAuthorityLeaseV1({
    world_id: manifest.world_id,
    region_id: west.region_id,
    authority_node_id: `voidnode1_${"1".repeat(64)}`,
    generation: 0,
    previous_lease_id: null,
    valid_from_utc: "2026-08-04T12:00:00Z",
    valid_until_utc: "2026-08-04T13:00:00Z",
  });
  const eastLease = await materializeVoidRealmsRegionAuthorityLeaseV1({
    world_id: manifest.world_id,
    region_id: east.region_id,
    authority_node_id: `voidnode1_${"2".repeat(64)}`,
    generation: 0,
    previous_lease_id: null,
    valid_from_utc: "2026-08-04T12:00:00Z",
    valid_until_utc: "2026-08-04T13:00:00Z",
  });
  const northLease = await materializeVoidRealmsRegionAuthorityLeaseV1({
    world_id: manifest.world_id,
    region_id: north.region_id,
    authority_node_id: `voidnode1_${"4".repeat(64)}`,
    generation: 0,
    previous_lease_id: null,
    valid_from_utc: "2026-08-04T12:00:00Z",
    valid_until_utc: "2026-08-04T13:00:00Z",
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
    recorded_at_utc: "2026-08-04T12:10:00Z",
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
    recorded_at_utc: "2026-08-04T12:20:00Z",
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
    recorded_at_utc: "2026-08-04T12:20:00Z",
  });

  const worldCheckpoint = await materializeVoidRealmsWorldCheckpointV1({
    world_id: manifest.world_id,
    epoch: 0,
    parent_world_checkpoint_id: null,
    region_checkpoints: [west1, east0],
    recorded_at_utc: "2026-08-04T12:20:05Z",
  });

  const graph: VoidRealmsCheckpointGraphV1 = {
    marker: VOID_REALMS_CHECKPOINT_GRAPH_INTEGRITY_GUARD_MARKER,
    version: 1,
    world_checkpoint: worldCheckpoint,
    region_checkpoint_chains: [[west0, west1], [east0]],
    authority_leases: [westLease, eastLease],
  };

  const verification = await verifyVoidRealmsCheckpointGraphV1(graph);
  assertCondition(verification.verified, "checkpoint graph was not verified");
  assertCondition(
    verification.terminal_region_checkpoint_ids.length === 2,
    "terminal checkpoint count mismatch",
  );
  assertCondition(
    verification.authority_lease_ids.length === 2,
    "authority lease count mismatch",
  );

  const handoff =
    await planVoidRealmsPlayerRegionHandoffWithVerifiedCheckpointGraphV1({
      checkpoint_graph: graph,
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
      not_before_utc: "2026-08-04T12:20:10Z",
      expires_at_utc: "2026-08-04T12:20:40Z",
    });
  const receipt =
    await acceptVoidRealmsPlayerRegionHandoffWithVerifiedCheckpointGraphV1({
      checkpoint_graph: graph,
      handoff,
      world_checkpoint: worldCheckpoint,
      destination_checkpoint: east0,
      accepted_at_utc: "2026-08-04T12:20:20Z",
    });
  assertCondition(
    receipt.gameplay_state_committed === false,
    "verified handoff acceptance committed gameplay state",
  );

  const tamperedLeaseGraph = clone(graph);
  tamperedLeaseGraph.authority_leases[0].authority_node_id =
    `voidnode1_${"9".repeat(64)}`;
  await expectReject("lease body tampering", () =>
    verifyVoidRealmsCheckpointGraphV1(tamperedLeaseGraph),
  );

  const tamperedStateRootGraph = clone(graph);
  tamperedStateRootGraph.region_checkpoint_chains[0][1].state_root_sha256 =
    "9".repeat(64);
  await expectReject("region state-root tampering", () =>
    verifyVoidRealmsCheckpointGraphV1(tamperedStateRootGraph),
  );

  const tamperedEventRootGraph = clone(graph);
  tamperedEventRootGraph.region_checkpoint_chains[0][1].event_log_root_sha256 =
    "8".repeat(64);
  await expectReject("region event-root tampering", () =>
    verifyVoidRealmsCheckpointGraphV1(tamperedEventRootGraph),
  );

  const tamperedCheckpointIdGraph = clone(graph);
  tamperedCheckpointIdGraph.region_checkpoint_chains[0][1].checkpoint_id =
    `voidrcp1_${"7".repeat(64)}`;
  await expectReject("region checkpoint ID tampering", () =>
    verifyVoidRealmsCheckpointGraphV1(tamperedCheckpointIdGraph),
  );

  const tamperedWorldRootGraph = clone(graph);
  tamperedWorldRootGraph.world_checkpoint.region_set_root_sha256 =
    "6".repeat(64);
  await expectReject("world region-set-root tampering", () =>
    verifyVoidRealmsCheckpointGraphV1(tamperedWorldRootGraph),
  );

  const unsortedWorldSetGraph = clone(graph);
  unsortedWorldSetGraph.world_checkpoint.region_checkpoint_ids.reverse();
  await expectReject("unsorted world checkpoint set", () =>
    verifyVoidRealmsCheckpointGraphV1(unsortedWorldSetGraph),
  );

  const unreferencedLeaseGraph = clone(graph);
  unreferencedLeaseGraph.authority_leases = [
    ...unreferencedLeaseGraph.authority_leases,
    northLease,
  ];
  await expectReject("unreferenced lease", () =>
    verifyVoidRealmsCheckpointGraphV1(unreferencedLeaseGraph),
  );

  await expectReject("handoff through tampered graph", () =>
    planVoidRealmsPlayerRegionHandoffWithVerifiedCheckpointGraphV1({
      checkpoint_graph: tamperedStateRootGraph,
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
      not_before_utc: "2026-08-04T12:20:10Z",
      expires_at_utc: "2026-08-04T12:20:40Z",
    }),
  );

  assertCondition(
    VOID_REALMS_SINGLE_WORLD_INPUT_MARKER ===
      "VOID_REALMS_SINGLE_CANONICAL_WORLD_FOUNDATION_V1",
    "canonical world marker changed",
  );
  console.log(`world_id=${manifest.world_id}`);
  console.log(`world_checkpoint_id=${worldCheckpoint.world_checkpoint_id}`);
  console.log(
    `terminal_checkpoint_count=${verification.terminal_region_checkpoint_ids.length}`,
  );
  console.log("checkpoint_signing_performed=false");
  console.log("gameplay_state_committed=false");
  console.log("deployment_performed=false");
  console.log("work_credit_write_performed=false");
  console.log("wallet_or_signer_access_performed=false");
  console.log("payment_execution_performed=false");
  console.log("fund_movement_performed=false");
  console.log("VOID_REALMS_CHECKPOINT_GRAPH_INTEGRITY_GUARD_V1_PROOF_GREEN");
}

await main();
