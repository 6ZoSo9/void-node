import { cidForJson } from "../src/util/cid.js";
import { materializeVoidRealmsReplicaAdvertisementV1 } from "../src/game/void_realms_single_canonical_world_region_checkpoint_handoff_v1.js";
import type { VoidRealmsPlayerNodeReplicaAdvertisementV1 } from "../src/game/void_realms_single_canonical_world_region_checkpoint_handoff_v1.js";
import {
  materializeVoidRealmsReplicaAdvertisementWithIntegrityV1,
  verifyVoidRealmsReplicaAdvertisementContentAddressV1,
} from "../src/game/void_realms_replica_advertisement_integrity_guard_v1.js";

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

function advertisementBody(
  advertisement: VoidRealmsPlayerNodeReplicaAdvertisementV1,
) {
  return {
    marker: advertisement.marker,
    version: advertisement.version,
    world_id: advertisement.world_id,
    node_id: advertisement.node_id,
    region_checkpoint_id: advertisement.region_checkpoint_id,
    public_object_roots_sha256:
      advertisement.public_object_roots_sha256,
    available_bytes: advertisement.available_bytes,
    recorded_at_utc: advertisement.recorded_at_utc,
    status: advertisement.status,
    gameplay_authority: advertisement.gameplay_authority,
    checkpoint_signing_authority:
      advertisement.checkpoint_signing_authority,
    handoff_acceptance_authority:
      advertisement.handoff_acceptance_authority,
  };
}

async function readdress(
  advertisement: VoidRealmsPlayerNodeReplicaAdvertisementV1,
): Promise<VoidRealmsPlayerNodeReplicaAdvertisementV1> {
  advertisement.advertisement_id =
    `voidrra1_${await cidForJson(advertisementBody(advertisement))}`;
  return advertisement;
}

async function main(): Promise<void> {
  const worldId = `voidrw1_${"a".repeat(64)}`;
  const nodeId = `voidnode1_${"b".repeat(64)}`;
  const checkpointId = `voidrcp1_${"c".repeat(64)}`;
  const recordedAt = "2026-08-04T18:20:00Z";
  const evaluatedAt = "2026-08-04T18:20:30Z";

  const advertisement =
    await materializeVoidRealmsReplicaAdvertisementWithIntegrityV1({
      world_id: worldId,
      node_id: nodeId,
      region_checkpoint_id: checkpointId,
      public_object_roots_sha256: ["2".repeat(64), "1".repeat(64)],
      available_bytes: 1048576,
      recorded_at_utc: recordedAt,
      evaluated_at_utc: evaluatedAt,
      max_age_seconds: 300,
      max_future_skew_seconds: 5,
    });

  const expectation = {
    world_id: worldId,
    node_id: nodeId,
    region_checkpoint_id: checkpointId,
    evaluated_at_utc: evaluatedAt,
    max_age_seconds: 300,
    max_future_skew_seconds: 5,
  };
  const verification =
    await verifyVoidRealmsReplicaAdvertisementContentAddressV1(
      advertisement,
      expectation,
    );
  assertCondition(verification.verified, "advertisement was not verified");
  assertCondition(
    verification.public_object_count === 2,
    "public object count mismatch",
  );
  assertCondition(
    advertisement.public_object_roots_sha256[0] === "1".repeat(64),
    "guarded builder did not preserve canonical root ordering",
  );

  const directAdvertisement = await materializeVoidRealmsReplicaAdvertisementV1({
    world_id: worldId,
    node_id: nodeId,
    region_checkpoint_id: checkpointId,
    public_object_roots_sha256: ["1".repeat(64), "2".repeat(64)],
    available_bytes: 1048576,
    recorded_at_utc: recordedAt,
  });
  assertCondition(
    directAdvertisement.advertisement_id === advertisement.advertisement_id,
    "guarded builder changed canonical advertisement identity",
  );

  const rootTampering = clone(advertisement);
  rootTampering.public_object_roots_sha256[0] = "3".repeat(64);
  await expectReject("old-ID root tampering", () =>
    verifyVoidRealmsReplicaAdvertisementContentAddressV1(
      rootTampering,
      expectation,
    ),
  );

  const bytesTampering = clone(advertisement);
  bytesTampering.available_bytes += 1;
  await expectReject("old-ID byte tampering", () =>
    verifyVoidRealmsReplicaAdvertisementContentAddressV1(
      bytesTampering,
      expectation,
    ),
  );

  const timestampTampering = clone(advertisement);
  timestampTampering.recorded_at_utc = "2026-08-04T18:20:01Z";
  await expectReject("old-ID timestamp tampering", () =>
    verifyVoidRealmsReplicaAdvertisementContentAddressV1(
      timestampTampering,
      expectation,
    ),
  );

  const idTampering = clone(advertisement);
  idTampering.advertisement_id = `voidrra1_${"f".repeat(64)}`;
  await expectReject("advertisement ID substitution", () =>
    verifyVoidRealmsReplicaAdvertisementContentAddressV1(
      idTampering,
      expectation,
    ),
  );

  const reorderedRoots = await readdress(clone(advertisement));
  reorderedRoots.public_object_roots_sha256.reverse();
  await readdress(reorderedRoots);
  await expectReject("reordered object roots", () =>
    verifyVoidRealmsReplicaAdvertisementContentAddressV1(
      reorderedRoots,
      expectation,
    ),
  );

  const duplicateRoots = clone(advertisement);
  duplicateRoots.public_object_roots_sha256 = [
    "1".repeat(64),
    "1".repeat(64),
  ];
  await readdress(duplicateRoots);
  await expectReject("duplicate object roots", () =>
    verifyVoidRealmsReplicaAdvertisementContentAddressV1(
      duplicateRoots,
      expectation,
    ),
  );

  const zeroBytes = clone(advertisement);
  zeroBytes.available_bytes = 0;
  await readdress(zeroBytes);
  await expectReject("zero-byte available advertisement", () =>
    verifyVoidRealmsReplicaAdvertisementContentAddressV1(
      zeroBytes,
      expectation,
    ),
  );
  await expectReject("guarded zero-byte builder", () =>
    materializeVoidRealmsReplicaAdvertisementWithIntegrityV1({
      world_id: worldId,
      node_id: nodeId,
      region_checkpoint_id: checkpointId,
      public_object_roots_sha256: ["1".repeat(64)],
      available_bytes: 0,
      recorded_at_utc: recordedAt,
      evaluated_at_utc: evaluatedAt,
      max_age_seconds: 300,
      max_future_skew_seconds: 5,
    }),
  );

  const statusTampering = clone(advertisement);
  statusTampering.status = "not_available" as typeof statusTampering.status;
  await readdress(statusTampering);
  await expectReject("status tampering", () =>
    verifyVoidRealmsReplicaAdvertisementContentAddressV1(
      statusTampering,
      expectation,
    ),
  );

  const authorityTampering = clone(advertisement);
  authorityTampering.gameplay_authority = true as false;
  await readdress(authorityTampering);
  await expectReject("gameplay authority grant", () =>
    verifyVoidRealmsReplicaAdvertisementContentAddressV1(
      authorityTampering,
      expectation,
    ),
  );

  await expectReject("wrong expected world", () =>
    verifyVoidRealmsReplicaAdvertisementContentAddressV1(advertisement, {
      ...expectation,
      world_id: `voidrw1_${"d".repeat(64)}`,
    }),
  );
  await expectReject("wrong expected node", () =>
    verifyVoidRealmsReplicaAdvertisementContentAddressV1(advertisement, {
      ...expectation,
      node_id: `voidnode1_${"d".repeat(64)}`,
    }),
  );
  await expectReject("wrong expected checkpoint", () =>
    verifyVoidRealmsReplicaAdvertisementContentAddressV1(advertisement, {
      ...expectation,
      region_checkpoint_id: `voidrcp1_${"d".repeat(64)}`,
    }),
  );
  await expectReject("stale advertisement", () =>
    verifyVoidRealmsReplicaAdvertisementContentAddressV1(advertisement, {
      ...expectation,
      evaluated_at_utc: "2026-08-04T18:30:00Z",
    }),
  );
  await expectReject("future-dated advertisement", () =>
    verifyVoidRealmsReplicaAdvertisementContentAddressV1(advertisement, {
      ...expectation,
      evaluated_at_utc: "2026-08-04T18:19:50Z",
    }),
  );

  const extraKey = clone(advertisement) as VoidRealmsPlayerNodeReplicaAdvertisementV1 & {
    gameplay_state?: string;
  };
  extraKey.gameplay_state = "forbidden";
  await expectReject("extra advertisement key", () =>
    verifyVoidRealmsReplicaAdvertisementContentAddressV1(extraKey, expectation),
  );

  console.log(`advertisement_id=${advertisement.advertisement_id}`);
  console.log(`public_object_count=${verification.public_object_count}`);
  console.log(`available_bytes=${verification.available_bytes}`);
  console.log("positive_availability_required=true");
  console.log("content_address_recomputed=true");
  console.log("freshness_verified=true");
  console.log("gameplay_authority=false");
  console.log("checkpoint_signing_authority=false");
  console.log("handoff_acceptance_authority=false");
  console.log("deployment_performed=false");
  console.log("work_credit_write_performed=false");
  console.log("wallet_or_signer_access_performed=false");
  console.log("payment_execution_performed=false");
  console.log("fund_movement_performed=false");
  console.log("VOID_REALMS_REPLICA_ADVERTISEMENT_INTEGRITY_GUARD_V1_PROOF_GREEN");
}

await main();
