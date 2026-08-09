#!/usr/bin/env python3
from pathlib import Path

NODE = Path("src/node_core.ts")
PROOF = Path("scripts/prove_void_p2p_udp_swarm_node_post_retirement_recovery_mount_v1.ts")

node = NODE.read_text()
old_helper = '''private udpSwarmPostRetirementNewerSessionPresentV1(
  context: UdpSwarmPostRetirementRecoveryContextV1,
): boolean {
  const health = this.udpSwarmPromotedDirectRouteHealth.get(context.peer_node_id);
  if (health && health.session_id !== context.session_id) return true;

  const fallback = this.udpSwarmPromotedRelayFallbacks.get(context.peer_node_id);
  if (fallback && fallback.session_id !== context.session_id) return true;

  for (const peer of this.udpSwarmDirectCandidates.values()) {
    const candidate = peer.udpSwarmDirectCandidate;
    if (
      candidate &&
      candidate.expected_peer_node_id === context.peer_node_id &&
      candidate.session_id !== context.session_id
    ) return true;
  }
  return false;
}
'''
new_helper = '''private udpSwarmPostRetirementNewerSessionPresentV1(
  context: UdpSwarmPostRetirementRecoveryContextV1,
  nowMs: number,
): boolean {
  const control = this.udpSwarmControl.snapshot(nowMs);
  if (
    control.pending_requests.some(
      (entry) => entry.target_node_id === context.peer_node_id,
    )
  ) return true;
  if (
    control.active_routes.some(
      (entry) =>
        entry.peer_node_id === context.peer_node_id &&
        entry.session_id !== context.session_id,
    )
  ) return true;

  const health = this.udpSwarmPromotedDirectRouteHealth.get(context.peer_node_id);
  if (health && health.session_id !== context.session_id) return true;

  const fallback = this.udpSwarmPromotedRelayFallbacks.get(context.peer_node_id);
  if (fallback && fallback.session_id !== context.session_id) return true;

  for (const peer of this.udpSwarmDirectCandidates.values()) {
    const candidate = peer.udpSwarmDirectCandidate;
    if (
      candidate &&
      candidate.expected_peer_node_id === context.peer_node_id &&
      candidate.session_id !== context.session_id
    ) return true;
  }
  return false;
}
'''
if node.count(old_helper) != 1:
    raise SystemExit(f"expected exactly one old newer-session helper, found {node.count(old_helper)}")
node = node.replace(old_helper, new_helper, 1)

old_call = '''    newer_udp_swarm_session_present:
      this.udpSwarmPostRetirementNewerSessionPresentV1(context),
'''
new_call = '''    newer_udp_swarm_session_present:
      this.udpSwarmPostRetirementNewerSessionPresentV1(context, nowMs),
'''
if node.count(old_call) != 1:
    raise SystemExit(f"expected exactly one old newer-session call, found {node.count(old_call)}")
node = node.replace(old_call, new_call, 1)
NODE.write_text(node)

proof = PROOF.read_text()
anchor = '''    assert.equal(armed.active_recovery_network_attempts_started, 0);
    assert.equal(armed.verified_direct_evidence_persisted, false);
    assert.equal(armed.production_udp_activation_performed, false);

    // Saturate unrelated local pending capacity. connectViaRelay must reject
'''
insert = '''    assert.equal(armed.active_recovery_network_attempts_started, 0);
    assert.equal(armed.verified_direct_evidence_persisted, false);
    assert.equal(armed.production_udp_activation_performed, false);

    // A same-target authenticated-control upgrade already in flight owns newer
    // topology work. The stale retirement tombstone must clear without sending
    // a recovery RELAY_CONNECT through the retired session's relay.
    const recoveryContext = core.udpSwarmPostRetirementRecovery.get(remote.nodeId);
    assert(recoveryContext);
    const control = core.udpSwarmControl;
    const pendingControlRequestId = crypto.randomBytes(16).toString("hex");
    const pendingControlStreamId = crypto.randomBytes(16).toString("hex");
    control.pendingRequests.set(pendingControlRequestId, {
      request_id: pendingControlRequestId,
      relay_node_id: keypair().nodeId,
      target_node_id: remote.nodeId,
      stream_id: pendingControlStreamId,
      requested_at_ms: recoveryStartMs,
    });
    const pendingControlSnapshot = node.udpSwarmPostRetirementRecoverySnapshotV1(
      recoveryStartMs,
    );
    assert.equal(
      pendingControlSnapshot.recoveries[0]?.decision.reason,
      "newer_udp_swarm_session_present",
    );
    assert.deepEqual(
      core.sweepUdpSwarmPostRetirementRecoveryV1(recoveryStartMs),
      {
        contexts: 0,
        attempts_started: 0,
        attempts_rejected: 0,
        contexts_cleared: 1,
      },
    );
    assert.equal(relayConnectCount(fixture.sent, fixture.relayControlPeer), 0);
    control.pendingRequests.delete(pendingControlRequestId);
    recoveryContext.last_decision_reason = null;
    core.udpSwarmPostRetirementRecovery.set(remote.nodeId, recoveryContext);

    // An authenticated-control active route for the same peer on a different
    // relay is also newer ownership. It deliberately does not satisfy the old
    // relay's replacement-stream test, so this proves the newer-session guard.
    const newerRelay = keypair();
    const newerSessionId = crypto.randomBytes(16).toString("hex");
    const newerStreamId = crypto.randomBytes(16).toString("hex");
    const newerRequestId = crypto.randomBytes(16).toString("hex");
    const newerTicketId = crypto.randomBytes(16).toString("hex");
    const newerRelayStreamKey = core.relayStreamKey(
      newerRelay.nodeId,
      newerStreamId,
    );
    core.relayStreams.set(newerRelayStreamKey, {
      relay_node_id: newerRelay.nodeId,
      remote_node_id: remote.nodeId,
      stream_id: newerStreamId,
      outgoing: true,
      started: true,
      socket: new TestSocket(),
    });
    control.activeRoutes.set(newerSessionId, {
      request_id: newerRequestId,
      session_id: newerSessionId,
      relay_node_id: newerRelay.nodeId,
      peer_node_id: remote.nodeId,
      stream_id: newerStreamId,
      ticket_id: newerTicketId,
      expires_at_ms: recoveryStartMs + 60_000,
      offer_received: true,
    });
    const newerRouteSnapshot = node.udpSwarmPostRetirementRecoverySnapshotV1(
      recoveryStartMs,
    );
    assert.equal(
      newerRouteSnapshot.recoveries[0]?.decision.reason,
      "newer_udp_swarm_session_present",
    );
    assert.deepEqual(
      core.sweepUdpSwarmPostRetirementRecoveryV1(recoveryStartMs),
      {
        contexts: 0,
        attempts_started: 0,
        attempts_rejected: 0,
        contexts_cleared: 1,
      },
    );
    assert.equal(relayConnectCount(fixture.sent, fixture.relayControlPeer), 0);
    control.activeRoutes.delete(newerSessionId);
    core.relayStreams.delete(newerRelayStreamKey);
    recoveryContext.last_decision_reason = null;
    core.udpSwarmPostRetirementRecovery.set(remote.nodeId, recoveryContext);

    // Saturate unrelated local pending capacity. connectViaRelay must reject
'''
if proof.count(anchor) != 1:
    raise SystemExit(f"expected exactly one proof insertion anchor, found {proof.count(anchor)}")
proof = proof.replace(anchor, insert, 1)
PROOF.write_text(proof)

print("VOID_P2P_UDP_SWARM_NODE_POST_RETIREMENT_RECOVERY_NEWER_SESSION_GUARD_V1_PATCHED")
