import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { Node } from "../src/node_core.js";
import { deriveVoidNodeIdFromPublicPemV1 } from "../src/p2p/auth_v1.js";
import { VoidUdpSwarmDirectRouteHealthObserverV1 } from "../src/p2p/udp_swarm_direct_route_health_observer_v1.js";
import { VoidUdpSwarmDirectRouteHealthProbeV1 } from "../src/p2p/udp_swarm_direct_route_health_probe_v1.js";
import { VoidUdpSwarmRelayRetirementExecutorV1 } from "../src/p2p/udp_swarm_relay_retirement_executor_v1.js";

type TestKeypair = {
  privateKey: crypto.KeyObject;
  publicKey: crypto.KeyObject;
  nodeId: string;
  pubPEM: string;
};

class TestSocket {
  destroyed = false;
  readonly throwOnDestroy: boolean;

  constructor(throwOnDestroy = false) {
    this.throwOnDestroy = throwOnDestroy;
  }

  on(_event: "data" | "close" | "error", _listener: (...args: any[]) => void): this {
    return this;
  }

  write(_data: Uint8Array | string): boolean {
    return !this.destroyed;
  }

  destroy(): this {
    if (this.throwOnDestroy) throw new Error("synthetic relay destroy failure");
    this.destroyed = true;
    return this;
  }
}

function keypair(): TestKeypair {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  const pubPEM = publicKey.export({ type: "spki", format: "pem" }).toString();
  const nodeId = deriveVoidNodeIdFromPublicPemV1(pubPEM);
  assert(nodeId);
  return { privateKey, publicKey, nodeId, pubPEM };
}

function newNode(dataDir: string, kp: TestKeypair): Node {
  process.env.DATA_DIR = dataDir;
  process.env.BOOTSTRAP_ADDRS = "";
  process.env.P2P_BIND_HOST = "127.0.0.1";
  process.env.P2P_ADVERTISE_HOST = "127.0.0.1";
  return new Node(0, kp);
}

function internals(node: Node): any {
  return node as any;
}

type Fixture = ReturnType<typeof installAuthorizedFixture>;

function installAuthorizedFixture(input: {
  node: Node;
  local: TestKeypair;
  remote: TestKeypair;
  relay: TestKeypair;
  streamId: string;
  promotedAtMs: number;
  relayDestroyThrows?: boolean;
}) {
  const core = internals(input.node);
  const directSocket = new TestSocket();
  const relaySocket = new TestSocket(input.relayDestroyThrows === true);

  const directPeer = {
    id: input.remote.nodeId,
    socket: directSocket,
    framer: undefined,
    addr: `udp-swarm:${input.remote.nodeId}`,
    listens: [],
    outbound: true,
    handshakeDone: true,
    localChallenge: "0".repeat(64),
    authenticatedPublicPem: input.remote.pubPEM,
    authTimer: null,
    expectedNodeId: input.remote.nodeId,
    suppressReconnect: true,
    attachedAtMs: input.promotedAtMs,
    outboundSeenEmitted: false,
    transport: "direct",
    persistDirectEvidence: false,
    punchCapable: true,
  };
  const relayPeer = {
    id: input.remote.nodeId,
    socket: relaySocket,
    framer: undefined,
    addr: `relay:${input.relay.nodeId}/${input.streamId}->${input.remote.nodeId}`,
    listens: [],
    outbound: true,
    handshakeDone: true,
    localChallenge: "0".repeat(64),
    authenticatedPublicPem: input.remote.pubPEM,
    authTimer: null,
    expectedNodeId: input.remote.nodeId,
    suppressReconnect: true,
    attachedAtMs: input.promotedAtMs,
    outboundSeenEmitted: false,
    transport: "relay",
    relayViaNodeId: input.relay.nodeId,
    relayStreamId: input.streamId,
    persistDirectEvidence: false,
    punchCapable: false,
  };

  const sessionId = crypto.randomBytes(16).toString("hex");
  const observer = new VoidUdpSwarmDirectRouteHealthObserverV1({
    sessionId,
    expectedPeerNodeId: input.remote.nodeId,
    relayNodeId: input.relay.nodeId,
    relayStreamId: input.streamId,
    promotedAtMs: input.promotedAtMs,
  });
  const probe = new VoidUdpSwarmDirectRouteHealthProbeV1(sessionId);
  const retirement = new VoidUdpSwarmRelayRetirementExecutorV1({
    session_id: sessionId,
    expected_peer_node_id: input.remote.nodeId,
    relay_node_id: input.relay.nodeId,
    relay_stream_id: input.streamId,
  });
  const healthContext = {
    session_id: sessionId,
    peer_node_id: input.remote.nodeId,
    direct_peer: directPeer,
    observer,
    probe,
    retirement,
    next_probe_at_ms: input.promotedAtMs,
    relay_retired_at_ms: null,
    relay_retirement_last_error: null,
  };
  const fallback = Object.freeze({
    session_id: sessionId,
    peer_node_id: input.remote.nodeId,
    relay_node_id: input.relay.nodeId,
    relay_stream_id: input.streamId,
    direct_peer: directPeer,
    relay_peer: relayPeer,
  });

  core.peers.set(input.remote.nodeId, directPeer);
  core.relayStreams.set(`${input.relay.nodeId}:${input.streamId}`, {
    relay_node_id: input.relay.nodeId,
    remote_node_id: input.remote.nodeId,
    stream_id: input.streamId,
    outgoing: true,
    started: true,
    socket: relaySocket,
  });
  core.udpSwarmPromotedRelayFallbacks.set(input.remote.nodeId, fallback);
  core.udpSwarmPromotedDirectRouteHealth.set(input.remote.nodeId, healthContext);

  for (const offset of [0, 7_500, 15_000, 22_500, 30_000]) {
    assert.equal(
      observer.recordSuccessfulRoundTrip(input.promotedAtMs + offset, 10),
      true,
    );
  }

  return {
    core,
    sessionId,
    observer,
    retirement,
    healthContext,
    fallback,
    directPeer,
    relayPeer,
    directSocket,
    relaySocket,
    authorizedAtMs: input.promotedAtMs + 30_010,
  };
}

function assertAuthorizedBeforeRetirement(node: Node, fixture: Fixture): void {
  const snapshot = node.udpSwarmPromotedDirectRouteHealthSnapshotV1(
    fixture.authorizedAtMs,
  );
  assert.equal(snapshot.promoted_health_route_count, 1);
  assert.equal(snapshot.routes[0]?.session_id, fixture.sessionId);
  assert.equal(snapshot.routes[0]?.direct_route_live, true);
  assert.equal(snapshot.routes[0]?.relay_fallback_live, true);
  assert.equal(
    snapshot.routes[0]?.policy_decision.action,
    "authorize_relay_retirement",
  );
  assert.equal(snapshot.routes[0]?.relay_retirement_authorized, true);
  assert.equal(snapshot.routes[0]?.relay_retirement_performed, false);
  assert.equal(snapshot.routes[0]?.relay_retirement_phase, "pending");
  assert.equal(snapshot.relay_retirement_performed, false);
  assert.equal(snapshot.relay_retirement_indeterminate, false);
}

function assertRetired(node: Node, fixture: Fixture): void {
  const after = node.udpSwarmPromotedDirectRouteHealthSnapshotV1(
    fixture.authorizedAtMs,
  );
  assert.equal(after.promoted_health_route_count, 1);
  assert.equal(after.routes[0]?.direct_route_live, true);
  assert.equal(after.routes[0]?.relay_fallback_live, false);
  assert.equal(after.routes[0]?.policy_decision.action, "retain_relay");
  assert.equal(after.routes[0]?.policy_decision.reason, "relay_fallback_not_live");
  assert.equal(after.routes[0]?.relay_retirement_phase, "retired");
  assert.equal(after.routes[0]?.relay_retirement_callback_attempted, true);
  assert.equal(after.routes[0]?.relay_retirement_performed, true);
  assert.equal(after.routes[0]?.relay_retired_at_ms, fixture.authorizedAtMs);
  assert.equal(after.routes[0]?.relay_retirement_last_error, null);
  assert.equal(after.relay_retirement_performed, true);
  assert.equal(after.relay_retirement_indeterminate, false);
}

function main(): void {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-udp-node-relay-retirement-mount-v1-"),
  );
  try {
    const local = keypair();
    const remote = keypair();
    const relay = keypair();

    {
      const node = newNode(path.join(root, "success"), local);
      const fixture = installAuthorizedFixture({
        node,
        local,
        remote,
        relay,
        streamId: crypto.randomBytes(16).toString("hex"),
        promotedAtMs: 1_000_000,
      });
      assertAuthorizedBeforeRetirement(node, fixture);

      const result = fixture.core.sweepUdpSwarmPromotedRelayRetirementV1(
        fixture.authorizedAtMs,
      );
      assert.deepEqual(result, {
        retirements_performed: 1,
        terminal_failures: 0,
      });
      assert.equal(fixture.relaySocket.destroyed, true);
      assert.equal(fixture.directSocket.destroyed, false);
      assert.strictEqual(node.peers.get(remote.nodeId), fixture.directPeer);
      assert.equal(
        fixture.core.udpSwarmPromotedRelayFallbacks.has(remote.nodeId),
        false,
      );
      assert.equal(
        fixture.core.udpSwarmPromotedDirectRouteHealth.has(remote.nodeId),
        true,
      );
      assertRetired(node, fixture);

      assert.deepEqual(
        fixture.core.sweepUdpSwarmPromotedRelayRetirementV1(
          fixture.authorizedAtMs + 1,
        ),
        { retirements_performed: 0, terminal_failures: 0 },
      );
      fixture.core.peers.delete(remote.nodeId);
      assert.equal(
        fixture.core.restoreUdpSwarmRelayFallbackAfterDirectCloseV1(
          fixture.directPeer,
        ),
        false,
      );
      assert.equal(node.peers.has(remote.nodeId), false);
    }

    {
      const node = newNode(path.join(root, "stale-binding"), local);
      const fixture = installAuthorizedFixture({
        node,
        local,
        remote,
        relay,
        streamId: crypto.randomBytes(16).toString("hex"),
        promotedAtMs: 2_000_000,
      });
      assertAuthorizedBeforeRetirement(node, fixture);
      const alteredFallback = Object.freeze({
        ...fixture.fallback,
        direct_peer: { ...fixture.directPeer },
      });
      fixture.core.udpSwarmPromotedRelayFallbacks.set(
        remote.nodeId,
        alteredFallback,
      );
      assert.deepEqual(
        fixture.core.sweepUdpSwarmPromotedRelayRetirementV1(
          fixture.authorizedAtMs,
        ),
        { retirements_performed: 0, terminal_failures: 0 },
      );
      assert.equal(fixture.relaySocket.destroyed, false);
      assert.equal(fixture.retirement.snapshot().phase, "pending");

      fixture.core.udpSwarmPromotedRelayFallbacks.set(
        remote.nodeId,
        fixture.fallback,
      );
      assert.deepEqual(
        fixture.core.sweepUdpSwarmPromotedRelayRetirementV1(
          fixture.authorizedAtMs,
        ),
        { retirements_performed: 1, terminal_failures: 0 },
      );
      assertRetired(node, fixture);
    }

    {
      const node = newNode(path.join(root, "indeterminate"), local);
      const fixture = installAuthorizedFixture({
        node,
        local,
        remote,
        relay,
        streamId: crypto.randomBytes(16).toString("hex"),
        promotedAtMs: 3_000_000,
        relayDestroyThrows: true,
      });
      assertAuthorizedBeforeRetirement(node, fixture);
      assert.deepEqual(
        fixture.core.sweepUdpSwarmPromotedRelayRetirementV1(
          fixture.authorizedAtMs,
        ),
        { retirements_performed: 0, terminal_failures: 1 },
      );
      assert.strictEqual(node.peers.get(remote.nodeId), fixture.directPeer);
      assert.equal(fixture.directSocket.destroyed, false);
      assert.equal(
        fixture.core.udpSwarmPromotedRelayFallbacks.has(remote.nodeId),
        false,
      );
      const after = node.udpSwarmPromotedDirectRouteHealthSnapshotV1(
        fixture.authorizedAtMs,
      );
      assert.equal(after.routes[0]?.relay_retirement_phase, "callback_indeterminate");
      assert.equal(after.routes[0]?.relay_retirement_performed, null);
      assert.equal(
        after.routes[0]?.relay_retirement_last_error,
        "retirement_callback_threw",
      );
      assert.equal(after.relay_retirement_performed, false);
      assert.equal(after.relay_retirement_indeterminate, true);
      assert.deepEqual(
        fixture.core.sweepUdpSwarmPromotedRelayRetirementV1(
          fixture.authorizedAtMs + 1,
        ),
        { retirements_performed: 0, terminal_failures: 0 },
      );
    }

    console.log(
      "VOID_P2P_UDP_SWARM_NODE_RELAY_RETIREMENT_MOUNT_V1_PROOF_GREEN",
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main();
