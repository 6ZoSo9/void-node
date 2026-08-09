import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { Node } from "../src/node_core.js";
import { deriveVoidNodeIdFromPublicPemV1 } from "../src/p2p/auth_v1.js";
import { VoidUdpSwarmDirectRouteHealthObserverV1 } from "../src/p2p/udp_swarm_direct_route_health_observer_v1.js";
import { VoidUdpSwarmDirectRouteHealthProbeV1 } from "../src/p2p/udp_swarm_direct_route_health_probe_v1.js";
import { VOID_P2P_RELAY_MAX_PENDING_REQUESTS_V1 } from "../src/p2p/relay_v1.js";
import { VoidUdpSwarmRelayRetirementExecutorV1 } from "../src/p2p/udp_swarm_relay_retirement_executor_v1.js";

class TestSocket {
  destroyed = false;
  writableLength = 0;

  on(_event: "data" | "close" | "error", _listener: (...args: any[]) => void): this {
    return this;
  }

  write(_data: Uint8Array | string): boolean {
    return !this.destroyed;
  }

  destroy(): this {
    this.destroyed = true;
    return this;
  }
}

type TestKeypair = {
  privateKey: crypto.KeyObject;
  publicKey: crypto.KeyObject;
  nodeId: string;
  pubPEM: string;
};

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

type CapturedSend = {
  peer: any;
  message: any;
};

function captureSendRaw(core: any): CapturedSend[] {
  const captured: CapturedSend[] = [];
  core.sendRaw = (peer: any, message: any) => {
    captured.push({ peer, message: structuredClone(message) });
  };
  return captured;
}

function authenticatedDirectPeer(input: {
  nodeId: string;
  pubPEM: string;
  label: string;
}) {
  return {
    id: input.nodeId,
    socket: new TestSocket(),
    framer: undefined,
    addr: input.label,
    listens: [],
    outbound: true,
    handshakeDone: true,
    localChallenge: "0".repeat(64),
    authenticatedPublicPem: input.pubPEM,
    authTimer: null,
    expectedNodeId: input.nodeId,
    suppressReconnect: false,
    attachedAtMs: 1,
    outboundSeenEmitted: false,
    transport: "direct",
    persistDirectEvidence: true,
    punchCapable: true,
  };
}

function installRetirementFixture(input: {
  node: Node;
  remote: TestKeypair;
  relay: TestKeypair;
  promotedAtMs: number;
}) {
  const core = internals(input.node);
  const sent = captureSendRaw(core);
  const streamId = crypto.randomBytes(16).toString("hex");
  const sessionId = crypto.randomBytes(16).toString("hex");

  const directSocket = new TestSocket();
  const retiredRelaySocket = new TestSocket();
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
  const retiredRelayPeer = {
    id: input.remote.nodeId,
    socket: retiredRelaySocket,
    framer: undefined,
    addr: `relay:${input.relay.nodeId}/${streamId}->${input.remote.nodeId}`,
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
    relayStreamId: streamId,
    persistDirectEvidence: false,
    punchCapable: false,
  };
  const relayControlPeer = authenticatedDirectPeer({
    nodeId: input.relay.nodeId,
    pubPEM: input.relay.pubPEM,
    label: `relay-control:${input.relay.nodeId}`,
  });

  const observer = new VoidUdpSwarmDirectRouteHealthObserverV1({
    sessionId,
    expectedPeerNodeId: input.remote.nodeId,
    relayNodeId: input.relay.nodeId,
    relayStreamId: streamId,
    promotedAtMs: input.promotedAtMs,
  });
  const probe = new VoidUdpSwarmDirectRouteHealthProbeV1(sessionId);
  const retirement = new VoidUdpSwarmRelayRetirementExecutorV1({
    session_id: sessionId,
    expected_peer_node_id: input.remote.nodeId,
    relay_node_id: input.relay.nodeId,
    relay_stream_id: streamId,
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
    relay_stream_id: streamId,
    direct_peer: directPeer,
    relay_peer: retiredRelayPeer,
  });

  core.peers.set(input.remote.nodeId, directPeer);
  core.peers.set(input.relay.nodeId, relayControlPeer);
  core.relayStreams.set(`${input.relay.nodeId}:${streamId}`, {
    relay_node_id: input.relay.nodeId,
    remote_node_id: input.remote.nodeId,
    stream_id: streamId,
    outgoing: true,
    started: true,
    socket: retiredRelaySocket,
  });
  core.udpSwarmPromotedRelayFallbacks.set(input.remote.nodeId, fallback);
  core.udpSwarmPromotedDirectRouteHealth.set(input.remote.nodeId, healthContext);

  for (const offset of [0, 7_500, 15_000, 22_500, 30_000]) {
    assert.equal(
      observer.recordSuccessfulRoundTrip(input.promotedAtMs + offset, 10),
      true,
    );
  }

  const authorizedAtMs = input.promotedAtMs + 30_010;
  const retirementResult = core.sweepUdpSwarmPromotedRelayRetirementV1(
    authorizedAtMs,
  );
  assert.deepEqual(retirementResult, {
    retirements_performed: 1,
    terminal_failures: 0,
  });
  assert.equal(retirement.snapshot().phase, "retired");
  assert.equal(retirement.snapshot().relay_retirement_performed, true);
  assert.equal(healthContext.relay_retired_at_ms, authorizedAtMs);
  assert.equal(retiredRelaySocket.destroyed, true);
  assert.equal(directSocket.destroyed, false);
  assert.equal(
    core.udpSwarmPromotedRelayFallbacks.has(input.remote.nodeId),
    false,
  );

  // The real attached relay virtual socket removes its local relay-stream record
  // through the close path. This synthetic relay peer is not attached, so model
  // that already-proven #1140 cleanup explicitly before exercising recovery.
  core.relayStreams.delete(`${input.relay.nodeId}:${streamId}`);

  return {
    core,
    sent,
    sessionId,
    streamId,
    authorizedAtMs,
    directPeer,
    directSocket,
    retiredRelayPeer,
    retiredRelaySocket,
    relayControlPeer,
    healthContext,
  };
}

function latestRelayConnect(
  captured: CapturedSend[],
  relayControlPeer: any,
) {
  return [...captured]
    .reverse()
    .find(
      (entry) =>
        entry.peer === relayControlPeer &&
        entry.message?.type === "RELAY_CONNECT",
    )?.message;
}

function relayConnectCount(
  captured: CapturedSend[],
  relayControlPeer: any,
): number {
  return captured.filter(
    (entry) =>
      entry.peer === relayControlPeer &&
      entry.message?.type === "RELAY_CONNECT",
  ).length;
}

function main(): void {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-udp-post-retirement-recovery-mount-v1-"),
  );
  try {
    const local = keypair();
    const remote = keypair();
    const relay = keypair();
    const node = newNode(path.join(root, "node"), local);
    const fixture = installRetirementFixture({
      node,
      remote,
      relay,
      promotedAtMs: 1_000_000,
    });
    const { core } = fixture;

    // Model the exact normal-route removal that precedes the Node close callback.
    assert.strictEqual(core.peers.get(remote.nodeId), fixture.directPeer);
    core.peers.delete(remote.nodeId);
    assert.equal(
      core.captureUdpSwarmPostRetirementRecoveryAfterDirectCloseV1(
        fixture.directPeer,
      ),
      true,
    );
    assert.equal(
      core.udpSwarmPromotedDirectRouteHealth.has(remote.nodeId),
      false,
    );
    assert.equal(core.udpSwarmPostRetirementRecovery.size, 1);

    const recoveryStartMs = fixture.authorizedAtMs + 1_000;
    const armed = node.udpSwarmPostRetirementRecoverySnapshotV1(
      recoveryStartMs,
    );
    assert.equal(armed.recovery_context_count, 1);
    assert.equal(
      armed.recoveries[0]?.decision.action,
      "authorize_fresh_relay_reacquisition",
    );
    assert.equal(
      armed.recoveries[0]?.decision.reason,
      "fresh_relay_reacquisition_may_be_authorized",
    );
    assert.equal(armed.recoveries[0]?.reacquisition_attempt_count, 0);
    assert.equal(armed.recoveries[0]?.last_reacquisition_attempt_at_ms, null);
    assert.equal(armed.recoveries[0]?.local_admission_retry_at_ms, null);
    assert.equal(armed.recoveries[0]?.last_request_id, null);
    assert.equal(armed.active_recovery_network_attempts_started, 0);
    assert.equal(armed.verified_direct_evidence_persisted, false);
    assert.equal(armed.production_udp_activation_performed, false);

    // Saturate unrelated local pending capacity. connectViaRelay must reject
    // admission without sending RELAY_CONNECT and without consuming one of the
    // three network-attempt slots. The runtime adds a local 5-second backoff.
    for (let i = 0; i < VOID_P2P_RELAY_MAX_PENDING_REQUESTS_V1; i += 1) {
      core.relayPendingConnects.set(i.toString(16).padStart(32, "0"), {
        relay_node_id: "33".repeat(16),
        target_node_id: "44".repeat(16),
        requested_at_ms: recoveryStartMs,
      });
    }
    assert.equal(
      core.relayPendingConnects.size,
      VOID_P2P_RELAY_MAX_PENDING_REQUESTS_V1,
    );
    assert.deepEqual(
      core.sweepUdpSwarmPostRetirementRecoveryV1(recoveryStartMs),
      {
        contexts: 1,
        attempts_started: 0,
        attempts_rejected: 1,
        contexts_cleared: 0,
      },
    );
    assert.equal(relayConnectCount(fixture.sent, fixture.relayControlPeer), 0);
    const admissionRejected = node.udpSwarmPostRetirementRecoverySnapshotV1(
      recoveryStartMs,
    );
    assert.equal(admissionRejected.recoveries[0]?.reacquisition_attempt_count, 0);
    assert.equal(
      admissionRejected.recoveries[0]?.last_reacquisition_attempt_at_ms,
      null,
    );
    assert.equal(
      admissionRejected.recoveries[0]?.local_admission_retry_at_ms,
      recoveryStartMs + 5_000,
    );
    assert.equal(
      admissionRejected.recoveries[0]?.last_error,
      "relay_connect_request_not_started",
    );
    assert.equal(
      admissionRejected.recoveries[0]?.last_decision_reason,
      "local_relay_admission_rejected",
    );
    core.relayPendingConnects.clear();

    assert.deepEqual(
      core.sweepUdpSwarmPostRetirementRecoveryV1(recoveryStartMs + 4_999),
      {
        contexts: 1,
        attempts_started: 0,
        attempts_rejected: 0,
        contexts_cleared: 0,
      },
    );
    assert.equal(relayConnectCount(fixture.sent, fixture.relayControlPeer), 0);
    const localBackoff = node.udpSwarmPostRetirementRecoverySnapshotV1(
      recoveryStartMs + 4_999,
    );
    assert.equal(localBackoff.recoveries[0]?.reacquisition_attempt_count, 0);
    assert.equal(localBackoff.recoveries[0]?.local_admission_retry_active, true);
    assert.equal(
      localBackoff.recoveries[0]?.last_decision_reason,
      "local_relay_admission_retry_interval_not_elapsed",
    );

    // First real bounded recovery attempt starts only after local admission
    // becomes available; this is network attempt #1, not #2.
    const firstAttemptMs = recoveryStartMs + 5_000;
    assert.deepEqual(
      core.sweepUdpSwarmPostRetirementRecoveryV1(firstAttemptMs),
      {
        contexts: 1,
        attempts_started: 1,
        attempts_rejected: 0,
        contexts_cleared: 0,
      },
    );
    assert.equal(relayConnectCount(fixture.sent, fixture.relayControlPeer), 1);
    const firstConnect = latestRelayConnect(
      fixture.sent,
      fixture.relayControlPeer,
    );
    assert(firstConnect);
    assert.match(firstConnect.request_id, /^[0-9a-f]{32}$/);
    assert.equal(firstConnect.target_node_id, remote.nodeId);
    assert.equal(core.relayPendingConnects.size, 1);

    const firstStarted = node.udpSwarmPostRetirementRecoverySnapshotV1(
      firstAttemptMs,
    );
    assert.equal(firstStarted.recoveries[0]?.reacquisition_attempt_count, 1);
    assert.equal(
      firstStarted.recoveries[0]?.last_reacquisition_attempt_at_ms,
      firstAttemptMs,
    );
    assert.equal(firstStarted.recoveries[0]?.local_admission_retry_at_ms, null);
    assert.equal(firstStarted.active_recovery_network_attempts_started, 1);

    const firstPending = core.relayPendingConnects.get(firstConnect.request_id);
    assert(firstPending);
    assert.equal(firstPending.relay_node_id, relay.nodeId);
    assert.equal(firstPending.target_node_id, remote.nodeId);

    const inFlight = node.udpSwarmPostRetirementRecoverySnapshotV1(
      firstAttemptMs + 5_000,
    );
    assert.equal(
      inFlight.recoveries[0]?.decision.reason,
      "recovery_already_in_flight",
    );
    assert.deepEqual(
      core.sweepUdpSwarmPostRetirementRecoveryV1(firstAttemptMs + 5_000),
      {
        contexts: 1,
        attempts_started: 0,
        attempts_rejected: 0,
        contexts_cleared: 0,
      },
    );
    assert.equal(relayConnectCount(fixture.sent, fixture.relayControlPeer), 1);

    // A rejection clears the existing relay pending request. Retry is still
    // bounded by the recovery policy's monotonic network-attempt timestamp.
    core.onRelayControlMessage(fixture.relayControlPeer, {
      type: "RELAY_REJECT",
      request_id: firstConnect.request_id,
      reason: "synthetic-reject",
    });
    assert.equal(core.relayPendingConnects.size, 0);

    assert.deepEqual(
      core.sweepUdpSwarmPostRetirementRecoveryV1(firstAttemptMs + 4_999),
      {
        contexts: 1,
        attempts_started: 0,
        attempts_rejected: 0,
        contexts_cleared: 0,
      },
    );
    const tooSoon = node.udpSwarmPostRetirementRecoverySnapshotV1(
      firstAttemptMs + 4_999,
    );
    assert.equal(
      tooSoon.recoveries[0]?.decision.reason,
      "retry_interval_not_elapsed",
    );

    const secondAttemptMs = firstAttemptMs + 5_000;
    assert.deepEqual(
      core.sweepUdpSwarmPostRetirementRecoveryV1(secondAttemptMs),
      {
        contexts: 1,
        attempts_started: 1,
        attempts_rejected: 0,
        contexts_cleared: 0,
      },
    );
    assert.equal(relayConnectCount(fixture.sent, fixture.relayControlPeer), 2);
    const secondConnect = latestRelayConnect(
      fixture.sent,
      fixture.relayControlPeer,
    );
    assert(secondConnect);
    assert.notEqual(secondConnect.request_id, firstConnect.request_id);

    // Existing relay protocol receives RELAY_CONNECTED and stages a brand-new
    // stream. The recovery policy sees that replacement and will not duplicate it.
    const replacementStreamId = crypto.randomBytes(16).toString("hex");
    assert.notEqual(replacementStreamId, fixture.streamId);
    core.onRelayControlMessage(fixture.relayControlPeer, {
      type: "RELAY_CONNECTED",
      request_id: secondConnect.request_id,
      stream_id: replacementStreamId,
      target_node_id: remote.nodeId,
    });
    assert.equal(core.relayPendingConnects.size, 0);
    assert.equal(
      core.relayStreams.has(`${relay.nodeId}:${replacementStreamId}`),
      true,
    );
    const replacementLive = node.udpSwarmPostRetirementRecoverySnapshotV1(
      secondAttemptMs + 1,
    );
    assert.equal(
      replacementLive.recoveries[0]?.decision.reason,
      "replacement_relay_stream_already_live",
    );
    assert.deepEqual(
      core.sweepUdpSwarmPostRetirementRecoveryV1(secondAttemptMs + 5_000),
      {
        contexts: 1,
        attempts_started: 0,
        attempts_rejected: 0,
        contexts_cleared: 0,
      },
    );
    assert.equal(relayConnectCount(fixture.sent, fixture.relayControlPeer), 2);

    // If that staged replacement fails, the third and final bounded request can
    // be attempted after the interval. The retired stream ID is never reused.
    core.finishRelayLocalStream(
      relay.nodeId,
      replacementStreamId,
      "synthetic-close",
    );
    assert.equal(
      core.relayStreams.has(`${relay.nodeId}:${replacementStreamId}`),
      false,
    );

    const thirdAttemptMs = secondAttemptMs + 5_000;
    assert.deepEqual(
      core.sweepUdpSwarmPostRetirementRecoveryV1(thirdAttemptMs),
      {
        contexts: 1,
        attempts_started: 1,
        attempts_rejected: 0,
        contexts_cleared: 0,
      },
    );
    assert.equal(relayConnectCount(fixture.sent, fixture.relayControlPeer), 3);
    const thirdConnect = latestRelayConnect(
      fixture.sent,
      fixture.relayControlPeer,
    );
    assert(thirdConnect);
    assert.notEqual(thirdConnect.request_id, firstConnect.request_id);
    assert.notEqual(thirdConnect.request_id, secondConnect.request_id);
    assert.equal(thirdConnect.target_node_id, remote.nodeId);

    core.onRelayControlMessage(fixture.relayControlPeer, {
      type: "RELAY_REJECT",
      request_id: thirdConnect.request_id,
      reason: "synthetic-reject",
    });
    assert.equal(core.relayPendingConnects.size, 0);

    const exhaustedAtMs = thirdAttemptMs + 5_000;
    const exhausted = node.udpSwarmPostRetirementRecoverySnapshotV1(
      exhaustedAtMs,
    );
    assert.equal(exhausted.recoveries[0]?.reacquisition_attempt_count, 3);
    assert.equal(exhausted.active_recovery_network_attempts_started, 3);
    assert.equal(
      exhausted.recoveries[0]?.decision.reason,
      "reacquisition_attempts_exhausted",
    );
    assert.deepEqual(
      core.sweepUdpSwarmPostRetirementRecoveryV1(exhaustedAtMs),
      {
        contexts: 1,
        attempts_started: 0,
        attempts_rejected: 0,
        contexts_cleared: 0,
      },
    );
    assert.equal(relayConnectCount(fixture.sent, fixture.relayControlPeer), 3);

    // If another normal route restores connectivity, the tombstone is removed
    // rather than continuing recovery or creating a duplicate relay request.
    const restoredRoute = {
      ...authenticatedDirectPeer({
        nodeId: remote.nodeId,
        pubPEM: remote.pubPEM,
        label: `restored:${remote.nodeId}`,
      }),
      transport: "relay",
      persistDirectEvidence: false,
      suppressReconnect: true,
    };
    core.peers.set(remote.nodeId, restoredRoute);
    assert.deepEqual(
      core.sweepUdpSwarmPostRetirementRecoveryV1(exhaustedAtMs + 1),
      {
        contexts: 0,
        attempts_started: 0,
        attempts_rejected: 0,
        contexts_cleared: 1,
      },
    );
    assert.equal(core.udpSwarmPostRetirementRecovery.size, 0);
    assert.equal(
      node.udpSwarmPostRetirementRecoverySnapshotV1(exhaustedAtMs + 1)
        .active_recovery_network_attempts_started,
      0,
    );
    assert.equal(relayConnectCount(fixture.sent, fixture.relayControlPeer), 3);

    // No recovery action ever changed the ephemeral direct-evidence boundary.
    assert.equal(fixture.directPeer.persistDirectEvidence, false);
    assert.equal(fixture.directSocket.destroyed, false);

    console.log("fresh_relay_connect_requests=3");
    console.log("local_admission_rejections=1");
    console.log("local_admission_rejection_consumes_network_attempt=false");
    console.log("local_admission_retry_interval_ms=5000");
    console.log("duplicate_request_while_in_flight=false");
    console.log("retired_stream_reused=false");
    console.log("replacement_stream_duplicate_request=false");
    console.log("automatic_recovery_attempts_bounded=true");
    console.log("normal_route_stops_recovery=true");
    console.log("verified_direct_evidence_persisted=false");
    console.log(
      "VOID_P2P_UDP_SWARM_NODE_POST_RETIREMENT_RECOVERY_MOUNT_V1_PROOF_GREEN",
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main();