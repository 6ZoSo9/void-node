#!/usr/bin/env python3
from __future__ import annotations

import hashlib
from pathlib import Path

NODE_PATH = Path("src/node_core.ts")
EXPECTED_NODE_BLOB = "ce520cd9ec198a5a2f1b5bc7e4b35b9f8c9f20ed"


def git_blob_sha(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode()
    return hashlib.sha1(header + data).hexdigest()


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, got {count}")
    return source.replace(old, new, 1)


raw = NODE_PATH.read_bytes()
actual_blob = git_blob_sha(raw)
if actual_blob != EXPECTED_NODE_BLOB:
    raise SystemExit(
        f"node_core source guard failed: expected {EXPECTED_NODE_BLOB}, got {actual_blob}"
    )
source = raw.decode("utf-8")

source = replace_once(
    source,
    '''import type { VoidUdpPeerSocketAdapterV1 } from "./p2p/udp_peer_socket_adapter_v1.js";
import { VoidUdpSwarmAuthenticatedDirectCandidateV1 } from "./p2p/udp_swarm_authenticated_direct_candidate_v1.js";
import { evaluateVoidUdpSwarmRelayPreservingTakeoverPolicyV1 } from "./p2p/udp_swarm_relay_preserving_takeover_policy_v1.js";
import {''',
    '''import type { VoidUdpPeerSocketAdapterV1 } from "./p2p/udp_peer_socket_adapter_v1.js";
import { VoidUdpSwarmAuthenticatedDirectCandidateV1 } from "./p2p/udp_swarm_authenticated_direct_candidate_v1.js";
import { evaluateVoidUdpSwarmRelayPreservingTakeoverPolicyV1 } from "./p2p/udp_swarm_relay_preserving_takeover_policy_v1.js";
import {
  VoidUdpSwarmDirectRouteHealthObserverV1,
  type VoidUdpSwarmDirectRouteHealthObserverRouteStateV1,
} from "./p2p/udp_swarm_direct_route_health_observer_v1.js";
import {
  VoidUdpSwarmDirectRouteHealthProbeV1,
  buildVoidUdpSwarmDirectRouteHealthPongV1,
  normalizeVoidUdpSwarmDirectRouteHealthProbeMessageV1,
  type VoidUdpSwarmDirectRouteHealthProbeMessageV1,
  type VoidUdpSwarmDirectRouteHealthProbeResultV1,
} from "./p2p/udp_swarm_direct_route_health_probe_v1.js";
import {''',
    "health imports",
)

source = replace_once(
    source,
    '''  | VoidRelayControlMessageV1
  | VoidUdpSwarmControlMessageV1
  | VoidDirectUpgradeControlMessageV1;''',
    '''  | VoidRelayControlMessageV1
  | VoidUdpSwarmControlMessageV1
  | VoidUdpSwarmDirectRouteHealthProbeMessageV1
  | VoidDirectUpgradeControlMessageV1;''',
    "health wire union",
)

source = replace_once(
    source,
    '''type UdpSwarmPromotedRelayFallbackV1 = Readonly<{
  session_id: string;
  peer_node_id: string;
  relay_node_id: string;
  relay_stream_id: string;
  direct_peer: Peer;
  relay_peer: Peer;
}>;

/** ================================================================= */''',
    '''type UdpSwarmPromotedRelayFallbackV1 = Readonly<{
  session_id: string;
  peer_node_id: string;
  relay_node_id: string;
  relay_stream_id: string;
  direct_peer: Peer;
  relay_peer: Peer;
}>;

type UdpSwarmPromotedDirectRouteHealthContextV1 = {
  session_id: string;
  peer_node_id: string;
  direct_peer: Peer;
  observer: VoidUdpSwarmDirectRouteHealthObserverV1;
  probe: VoidUdpSwarmDirectRouteHealthProbeV1;
  next_probe_at_ms: number;
};

const VOID_P2P_UDP_SWARM_PROMOTED_DIRECT_HEALTH_PROBE_INTERVAL_MS_V1 =
  7_500;

/** ================================================================= */''',
    "health context type",
)

source = replace_once(
    source,
    '''private readonly udpSwarmPromotedRelayFallbacks =
    new Map<string, UdpSwarmPromotedRelayFallbackV1>();

  private readonly directUpgradeEnabled: boolean;''',
    '''private readonly udpSwarmPromotedRelayFallbacks =
    new Map<string, UdpSwarmPromotedRelayFallbackV1>();
  private readonly udpSwarmPromotedDirectRouteHealth =
    new Map<string, UdpSwarmPromotedDirectRouteHealthContextV1>();

  private readonly directUpgradeEnabled: boolean;''',
    "health context map",
)

source = replace_once(
    source,
    '''        this.udpSwarmControl.sweep();
          this.sweepDirectUpgradeState();''',
    '''        this.udpSwarmControl.sweep();
          this.sweepDirectUpgradeState();
          this.sweepUdpSwarmPromotedDirectRouteHealthV1();''',
    "maintenance health sweep",
)

source = replace_once(
    source,
    '''  this.udpSwarmDirectCandidates.clear();
    this.udpSwarmPromotedRelayFallbacks.clear();
    for (const p of this.peers.values()) {''',
    '''  this.udpSwarmDirectCandidates.clear();
    this.udpSwarmPromotedRelayFallbacks.clear();
    this.udpSwarmPromotedDirectRouteHealth.clear();
    for (const p of this.peers.values()) {''',
    "health stop cleanup",
)

source = replace_once(
    source,
    '''const promotion = context.candidate.authorizeDirectPeerPromotion();''',
    '''const promotedAtMs = Date.now();
  let healthObserver: VoidUdpSwarmDirectRouteHealthObserverV1;
  let healthProbe: VoidUdpSwarmDirectRouteHealthProbeV1;
  try {
    healthObserver = new VoidUdpSwarmDirectRouteHealthObserverV1({
      sessionId,
      expectedPeerNodeId: context.expected_peer_node_id,
      relayNodeId: context.relay_node_id,
      relayStreamId: context.relay_stream_id,
      promotedAtMs,
    });
    healthProbe = new VoidUdpSwarmDirectRouteHealthProbeV1(sessionId);
  } catch {
    return { ok: false, error: "health_state_initialization_failed" };
  }

  const promotion =
    context.candidate.authorizeDirectPeerPromotion(promotedAtMs);''',
    "promotion health state construction",
)

source = replace_once(
    source,
    '''this.udpSwarmPromotedRelayFallbacks.set(
    context.expected_peer_node_id,
    Object.freeze({
      session_id: sessionId,
      peer_node_id: context.expected_peer_node_id,
      relay_node_id: context.relay_node_id,
      relay_stream_id: context.relay_stream_id,
      direct_peer: peer,
      relay_peer: relayPeer,
    }),
  );
  this.udpSwarmDirectCandidates.delete(sessionId);''',
    '''this.udpSwarmPromotedRelayFallbacks.set(
    context.expected_peer_node_id,
    Object.freeze({
      session_id: sessionId,
      peer_node_id: context.expected_peer_node_id,
      relay_node_id: context.relay_node_id,
      relay_stream_id: context.relay_stream_id,
      direct_peer: peer,
      relay_peer: relayPeer,
    }),
  );
  this.udpSwarmPromotedDirectRouteHealth.set(
    context.expected_peer_node_id,
    {
      session_id: sessionId,
      peer_node_id: context.expected_peer_node_id,
      direct_peer: peer,
      observer: healthObserver,
      probe: healthProbe,
      next_probe_at_ms: promotedAtMs,
    },
  );
  this.udpSwarmDirectCandidates.delete(sessionId);''',
    "promotion health mount",
)

source = replace_once(
    source,
    '''    if (closedNormalRoute && peer.transport === "direct") {
        this.restoreUdpSwarmRelayFallbackAfterDirectCloseV1(peer);
      }''',
    '''    if (closedNormalRoute && peer.transport === "direct") {
        this.udpSwarmPromotedDirectRouteHealth.delete(peer.id);
        this.restoreUdpSwarmRelayFallbackAfterDirectCloseV1(peer);
      }''',
    "direct close health cleanup",
)

source = replace_once(
    source,
    '''    if ((msg as any)?.type === "REACHABILITY_DIALBACK_REQUEST") {
      this.handleReachabilityDialbackRequest(peer, msg);
      return;
    }

    if ((msg as any)?.type === "REACHABILITY_DIALBACK_RESULT") {
      this.handleReachabilityDialbackResult(peer, msg);
      return;
    }

    const udpSwarmMessage = normalizeVoidUdpSwarmControlMessageV1(''',
    '''    if ((msg as any)?.type === "REACHABILITY_DIALBACK_REQUEST") {
      this.handleReachabilityDialbackRequest(peer, msg);
      return;
    }

    if ((msg as any)?.type === "REACHABILITY_DIALBACK_RESULT") {
      this.handleReachabilityDialbackResult(peer, msg);
      return;
    }

    const directHealthType = (msg as any)?.type;
    if (
      directHealthType === "UDP_SWARM_DIRECT_HEALTH_PING" ||
      directHealthType === "UDP_SWARM_DIRECT_HEALTH_PONG"
    ) {
      const healthMessage =
        normalizeVoidUdpSwarmDirectRouteHealthProbeMessageV1(msg);
      if (!healthMessage) {
        console.warn("VOID_P2P_UDP_SWARM_DIRECT_HEALTH_MOUNT_V1_REJECT", {
          peer_id: peer.id,
          reason: "invalid direct-route health message",
        });
        return;
      }
      this.handleUdpSwarmPromotedDirectRouteHealthMessageV1(
        peer,
        healthMessage,
      );
      return;
    }

    const udpSwarmMessage = normalizeVoidUdpSwarmControlMessageV1(''',
    "authenticated health wire handling",
)

health_methods = '''private udpSwarmPromotedDirectRouteHealthStateV1(
  context: UdpSwarmPromotedDirectRouteHealthContextV1,
): VoidUdpSwarmDirectRouteHealthObserverRouteStateV1 {
  const routedPeer = this.peers.get(context.peer_node_id);
  const directRouteLive =
    routedPeer === context.direct_peer &&
    routedPeer.handshakeDone &&
    !!routedPeer.authenticatedPublicPem &&
    routedPeer.transport === "direct" &&
    routedPeer.socket.destroyed !== true;
  const fallback =
    this.udpSwarmPromotedRelayFallbacks.get(context.peer_node_id);
  const relayFallbackLive =
    !!fallback &&
    fallback.session_id === context.session_id &&
    fallback.direct_peer === context.direct_peer &&
    this.exactLiveRelayPeerForUdpSwarmV1(
      fallback.relay_peer,
      fallback.peer_node_id,
      fallback.relay_node_id,
      fallback.relay_stream_id,
    ) === fallback.relay_peer;
  return Object.freeze({
    authenticated_peer_node_id:
      directRouteLive && routedPeer ? routedPeer.id : null,
    direct_route_live: directRouteLive,
    direct_route_transport: routedPeer?.transport ?? null,
    relay_fallback_live: relayFallbackLive,
  });
}

private udpSwarmPromotedDirectRouteHealthContextForPeerV1(
  peer: Peer,
  sessionId: string,
): UdpSwarmPromotedDirectRouteHealthContextV1 | undefined {
  const context = this.udpSwarmPromotedDirectRouteHealth.get(peer.id);
  if (
    !context ||
    context.session_id !== sessionId ||
    context.peer_node_id !== peer.id ||
    context.direct_peer !== peer
  ) return;
  const routeState =
    this.udpSwarmPromotedDirectRouteHealthStateV1(context);
  if (
    !routeState.direct_route_live ||
    !routeState.relay_fallback_live ||
    routeState.authenticated_peer_node_id !== peer.id ||
    routeState.direct_route_transport !== "direct"
  ) return;
  return context;
}

private recordUdpSwarmPromotedDirectRouteHealthResultV1(
  context: UdpSwarmPromotedDirectRouteHealthContextV1,
  result: VoidUdpSwarmDirectRouteHealthProbeResultV1,
): boolean {
  if (result.outcome === "success") {
    return context.observer.recordSuccessfulRoundTrip(
      result.observed_at_ms,
      result.rtt_ms,
    );
  }
  return context.observer.recordFailedRoundTrip(
    result.observed_at_ms,
    result.reason,
  );
}

private handleUdpSwarmPromotedDirectRouteHealthMessageV1(
  peer: Peer,
  message: VoidUdpSwarmDirectRouteHealthProbeMessageV1,
  nowMs = Date.now(),
): boolean {
  const context =
    this.udpSwarmPromotedDirectRouteHealthContextForPeerV1(
      peer,
      message.session_id,
    );
  if (!context) return false;

  if (message.type === "UDP_SWARM_DIRECT_HEALTH_PING") {
    const pong = buildVoidUdpSwarmDirectRouteHealthPongV1(message);
    if (!pong) return false;
    this.sendRaw(peer, pong);
    return true;
  }

  const result = context.probe.acceptPong(message, nowMs);
  if (!result) return false;
  return this.recordUdpSwarmPromotedDirectRouteHealthResultV1(
    context,
    result,
  );
}

private sweepUdpSwarmPromotedDirectRouteHealthV1(
  nowMs = Date.now(),
): { probes_sent: number; failures_recorded: number } {
  let probesSent = 0;
  let failuresRecorded = 0;
  for (const context of this.udpSwarmPromotedDirectRouteHealth.values()) {
    const routeState =
      this.udpSwarmPromotedDirectRouteHealthStateV1(context);
    if (!routeState.direct_route_live || !routeState.relay_fallback_live) {
      continue;
    }

    const expired = context.probe.expirePending(nowMs);
    if (
      expired &&
      this.recordUdpSwarmPromotedDirectRouteHealthResultV1(
        context,
        expired,
      )
    ) {
      failuresRecorded += 1;
    }
    if (context.probe.poisoned) continue;
    if (context.probe.snapshot().pending_probe) continue;
    if (!Number.isSafeInteger(nowMs) || nowMs < context.next_probe_at_ms) {
      continue;
    }

    const ping = context.probe.createPing(nowMs);
    if (!ping) continue;
    const nextProbeAtMs =
      nowMs +
      VOID_P2P_UDP_SWARM_PROMOTED_DIRECT_HEALTH_PROBE_INTERVAL_MS_V1;
    context.next_probe_at_ms = Number.isSafeInteger(nextProbeAtMs)
      ? nextProbeAtMs
      : Number.MAX_SAFE_INTEGER;
    this.sendRaw(context.direct_peer, ping);
    probesSent += 1;
  }
  return {
    probes_sent: probesSent,
    failures_recorded: failuresRecorded,
  };
}

udpSwarmPromotedDirectRouteHealthSnapshotV1(nowMs = Date.now()) {
  const routes = [...this.udpSwarmPromotedDirectRouteHealth.values()]
    .map((context) => {
      const routeState =
        this.udpSwarmPromotedDirectRouteHealthStateV1(context);
      const policyDecision = context.observer.evaluate(
        routeState,
        nowMs,
      );
      const observer = context.observer.snapshot();
      const probe = context.probe.snapshot();
      return {
        session_id: context.session_id,
        peer_node_id: context.peer_node_id,
        promoted_at_ms: observer.promoted_at_ms,
        direct_route_live: routeState.direct_route_live,
        direct_route_transport: routeState.direct_route_transport,
        relay_fallback_live: routeState.relay_fallback_live,
        observer,
        probe,
        policy_decision: policyDecision,
        relay_retirement_authorized:
          policyDecision.relay_retirement_authorized,
        relay_retirement_performed: false as const,
      };
    })
    .sort((a, b) => a.peer_node_id.localeCompare(b.peer_node_id));
  return {
    promoted_health_route_count: routes.length,
    routes,
    relay_retirement_performed: false as const,
  };
}

'''
source = replace_once(
    source,
    "attachEphemeralDirectTransportV1(\n",
    health_methods + "attachEphemeralDirectTransportV1(\n",
    "health methods before ephemeral mount",
)

NODE_PATH.write_text(source, encoding="utf-8")
print("VOID_P2P_UDP_SWARM_NODE_DIRECT_ROUTE_HEALTH_MOUNT_APPLY_V1_OK")
