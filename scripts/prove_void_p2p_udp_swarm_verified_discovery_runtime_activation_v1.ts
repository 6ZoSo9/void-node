// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import * as crypto from "node:crypto";

import type { Node } from "../src/node_core.js";
import { deriveVoidNodeIdFromPublicPemV1 } from "../src/p2p/auth_v1.js";
import {
  VoidUdpSwarmRelayOrchestratorV1,
  type VoidUdpSwarmRelayOrchestrationNodeV1,
} from "../src/p2p/udp_swarm_relay_orchestrator_v1.js";
import {
  VOID_P2P_UDP_SWARM_VERIFIED_DISCOVERY_COMPOSITION_MARKER_V1,
  createVoidUdpSwarmNodeRuntimeMountV1,
  parseVoidUdpSwarmVerifiedDiscoveryActivationV1,
  readVoidUdpSwarmNodeRuntimeEnvironmentV1,
} from "../src/p2p/udp_swarm_node_runtime_mount_v1.js";

const STATIC_RELAY = "a".repeat(32);
const STATIC_TARGET = "b".repeat(32);
const DYNAMIC_RELAY_A = "c".repeat(32);
const DYNAMIC_RELAY_B = "d".repeat(32);
const DYNAMIC_TARGET = "e".repeat(32);

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function compositionResult(
  routes: readonly string[],
  expiresAtMs: number,
  overrides: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, unknown>> {
  return deepFreeze({
    marker: VOID_P2P_UDP_SWARM_VERIFIED_DISCOVERY_COMPOSITION_MARKER_V1,
    record_id: `voidpbr2_${"1".repeat(64)}`,
    manifest_id: `voidpbm1_${"2".repeat(64)}`,
    discovery_id: `voidpud1_${"3".repeat(64)}`,
    expires_at: new Date(expiresAtMs).toISOString(),
    route_count: routes.length,
    source_count: 3,
    relay_count: 2,
    target_count: 1,
    relay_failure_domain_count: 2,
    n_minus_one_relay_coverage_verified: true,
    environment: {
      VOID_P2P_UDP_SWARM_ORCHESTRATION_ENABLED: "1",
      VOID_P2P_UDP_SWARM_ORCHESTRATION_ROUTES: routes.join(","),
    },
    transport_is_authority: false,
    wallet_signer_validator_wc_money_authority: 0,
    network_io_implemented: false,
    environment_mutation_performed: false,
    launcher_activation_performed: false,
    deployment_performed: false,
    service_restart_performed: false,
    ...overrides,
  });
}

async function waitFor(
  predicate: () => boolean,
  label: string,
  timeoutMs = 2_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`timed out waiting for ${label}`);
}

const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
const pubPEM = publicKey.export({ type: "spki", format: "pem" }).toString();
const localNodeId = deriveVoidNodeIdFromPublicPemV1(pubPEM);
assert(localNodeId);
assert(![
  STATIC_RELAY,
  STATIC_TARGET,
  DYNAMIC_RELAY_A,
  DYNAMIC_RELAY_B,
  DYNAMIC_TARGET,
].includes(localNodeId));

const retryStateReservationCalls: string[] = [];
const retryStateNode: VoidUdpSwarmRelayOrchestrationNodeV1 = {
  id: localNodeId,
  relaySnapshot: () => ({ client_reservations: [], streams: [] }),
  udpSwarmControlSnapshot: () => ({ pending_requests: [], active_routes: [] }),
  requestRelayReservation: (relayNodeId) => {
    retryStateReservationCalls.push(relayNodeId);
    return "7".repeat(32);
  },
  connectViaRelay: () => null,
  requestUdpSwarmUpgradeV1: () => ({
    ok: false as const,
    error: "not reached in retry-state proof",
  }),
};
const retryStateOrchestrator = new VoidUdpSwarmRelayOrchestratorV1(
  retryStateNode,
  {
    enabled: true,
    routes: [{
      relay_node_id: DYNAMIC_RELAY_A,
      target_node_id: DYNAMIC_TARGET,
    }],
  },
);
retryStateOrchestrator.runOnce(0);
retryStateOrchestrator.replaceVerifiedDiscoveryRoutesV1([{
  relay_node_id: DYNAMIC_RELAY_B,
  target_node_id: DYNAMIC_TARGET,
}]);
retryStateOrchestrator.runOnce(1);
retryStateOrchestrator.replaceVerifiedDiscoveryRoutesV1([
  {
    relay_node_id: DYNAMIC_RELAY_A,
    target_node_id: DYNAMIC_TARGET,
  },
  {
    relay_node_id: DYNAMIC_RELAY_B,
    target_node_id: DYNAMIC_TARGET,
  },
]);
retryStateOrchestrator.runOnce(2);
assert.deepEqual(retryStateReservationCalls, [
  DYNAMIC_RELAY_A,
  DYNAMIC_RELAY_B,
  DYNAMIC_RELAY_A,
]);
retryStateOrchestrator.stop();

const reservationCalls: string[] = [];
const fakeNode = {
  id: localNodeId,
  onUdpSwarmProbeAction: undefined,
  onUdpSwarmDirectUpgradeOffer: undefined,
  relaySnapshot: () => ({ client_reservations: [], streams: [] }),
  udpSwarmControlSnapshot: () => ({ pending_requests: [], active_routes: [] }),
  udpSwarmAuthenticatedDirectCandidateSnapshotV1: () => ({ candidates: [] }),
  udpSwarmPromotedDirectRouteSnapshotV1: () => ({ routes: [] }),
  requestRelayReservation: (relayNodeId: string) => {
    reservationCalls.push(relayNodeId);
    return "4".repeat(32);
  },
  connectViaRelay: () => "5".repeat(32),
  requestUdpSwarmUpgradeV1: () => ({
    ok: true as const,
    request_id: "6".repeat(32),
  }),
  ingestUdpSwarmRendezvousProbeV1: () => ({ ok: false as const }),
  stageUdpSwarmAuthenticatedDirectCandidateV1: () => false,
  promoteUdpSwarmAuthenticatedDirectCandidateV1: () => ({ ok: false as const }),
} as unknown as Node;

const config = readVoidUdpSwarmNodeRuntimeEnvironmentV1({
  NODE_ENV: "test",
  VOID_P2P_UDP_SWARM_RUNTIME_ENABLED: "1",
  VOID_P2P_UDP_SWARM_TEST_ALLOW_NONPUBLIC_ENDPOINTS: "1",
  VOID_P2P_UDP_SWARM_FAMILY: "udp4",
  VOID_P2P_UDP_SWARM_BIND_HOST: "127.0.0.1",
  VOID_P2P_UDP_SWARM_BIND_PORT: "0",
  VOID_P2P_UDP_SWARM_ORCHESTRATION_ENABLED: "1",
  VOID_P2P_UDP_SWARM_ORCHESTRATION_ROUTES:
    `${STATIC_RELAY}/${STATIC_TARGET}`,
});

const mount = await createVoidUdpSwarmNodeRuntimeMountV1({
  node: fakeNode,
  identity: { nodeId: localNodeId, pubPEM, privateKey },
  config,
});

try {
  const initialStatus = mount.status();
  assert.equal(
    (initialStatus.orchestration as Record<string, unknown>).route_source,
    "static_environment",
  );
  assert.equal(
    (initialStatus.orchestration as Record<string, unknown>).route_count,
    1,
  );
  assert.deepEqual(reservationCalls, [STATIC_RELAY]);

  const now = Date.now();
  const dynamicRoutes = [
    `${DYNAMIC_RELAY_A}/${DYNAMIC_TARGET}`,
    `${DYNAMIC_RELAY_B}/${DYNAMIC_TARGET}`,
  ];
  const valid = compositionResult(dynamicRoutes, now + 5_000);
  const parsed = parseVoidUdpSwarmVerifiedDiscoveryActivationV1(
    valid,
    localNodeId,
    now,
  );
  assert.equal(parsed.routes.length, 2);
  assert.equal(parsed.expires_at_ms, now + 5_000);

  const activated = mount.activateVerifiedDiscoveryCompositionV1(valid);
  assert.equal(activated.changed, true);
  assert.equal(activated.route_count, 2);
  const activeStatus = mount.status();
  const activeOrchestration = activeStatus.orchestration as Record<string, unknown>;
  assert.equal(activeOrchestration.route_source, "verified_discovery");
  assert.equal(activeOrchestration.route_count, 2);
  assert.equal(
    (activeStatus.verified_discovery as Record<string, unknown>).active,
    true,
  );
  const activeRevision = Number(activeOrchestration.route_revision);

  const duplicate = compositionResult([
    dynamicRoutes[0]!,
    dynamicRoutes[0]!,
  ], now + 5_000);
  assert.throws(
    () => mount.activateVerifiedDiscoveryCompositionV1(duplicate),
    /unique/,
  );
  const afterDuplicate = mount.status().orchestration as Record<string, unknown>;
  assert.equal(afterDuplicate.route_revision, activeRevision);
  assert.equal(afterDuplicate.route_count, 2);

  const localRoute = compositionResult([
    `${localNodeId}/${DYNAMIC_TARGET}`,
    `${DYNAMIC_RELAY_B}/${DYNAMIC_TARGET}`,
  ], now + 5_000);
  assert.throws(
    () => mount.activateVerifiedDiscoveryCompositionV1(localRoute),
    /local or self route/,
  );
  assert.throws(
    () => mount.activateVerifiedDiscoveryCompositionV1(
      compositionResult(dynamicRoutes, Date.now() - 1),
    ),
    /invalid or expired/,
  );
  assert.throws(
    () => parseVoidUdpSwarmVerifiedDiscoveryActivationV1(
      compositionResult(dynamicRoutes, now + 5_000, {
        environment_mutation_performed: true,
      }),
      localNodeId,
      now,
    ),
    /authority boundary changed/,
  );

  const cleared = mount.clearVerifiedDiscoveryCompositionV1();
  assert.equal(cleared.changed, true);
  assert.equal(cleared.route_count, 1);
  const restoredStatus = mount.status();
  assert.equal(
    (restoredStatus.orchestration as Record<string, unknown>).route_source,
    "static_environment",
  );
  assert.equal(
    (restoredStatus.verified_discovery as Record<string, unknown>).active,
    false,
  );

  const expiringNow = Date.now();
  mount.activateVerifiedDiscoveryCompositionV1(
    compositionResult(dynamicRoutes, expiringNow + 75),
  );
  await waitFor(
    () =>
      (mount.status().orchestration as Record<string, unknown>).route_source ===
      "static_environment",
    "verified discovery expiry restoration",
  );
  const expiredStatus = mount.status();
  assert.equal(
    (expiredStatus.counters as Record<string, unknown>)
      .verified_discovery_expiry_clears,
    1,
  );

  const publicStatus = JSON.stringify(expiredStatus);
  for (const privateIdentity of [
    localNodeId,
    STATIC_RELAY,
    STATIC_TARGET,
    DYNAMIC_RELAY_A,
    DYNAMIC_RELAY_B,
    DYNAMIC_TARGET,
  ]) {
    assert.equal(publicStatus.includes(privateIdentity), false);
  }

  console.log(JSON.stringify({
    marker:
      "VOID_P2P_UDP_SWARM_VERIFIED_DISCOVERY_RUNTIME_ACTIVATION_V1_PROOF",
    status: "green",
    checks: {
      exact_frozen_composition_contract_required: true,
      verified_expiry_bound_to_activation_lease: true,
      atomic_route_replacement: true,
      rejected_update_preserved_prior_routes: true,
      duplicate_and_local_routes_rejected: true,
      static_route_fallback_restored_on_clear: true,
      automatic_expiry_clear_performed: true,
      removed_route_retry_state_cleared: true,
      sanitized_readonly_status: true,
      environment_mutation_performed: false,
      deployment_performed: false,
      service_restart_performed: false,
    },
  }, null, 2));
} finally {
  await mount.stop();
}
