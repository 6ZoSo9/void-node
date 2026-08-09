#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

PATH = Path("src/node_core.ts")
text = PATH.read_text(encoding="utf-8")


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one anchor, found {count}")
    text = text.replace(old, new, 1)


if "VoidUdpSwarmRelayRetirementExecutorV1" in text:
    raise SystemExit("relay-retirement Node mount already appears materialized")

replace_once(
    '''import {
  VoidUdpSwarmDirectRouteHealthProbeV1,
  buildVoidUdpSwarmDirectRouteHealthPongV1,
  normalizeVoidUdpSwarmDirectRouteHealthProbeMessageV1,
  type VoidUdpSwarmDirectRouteHealthProbeMessageV1,
  type VoidUdpSwarmDirectRouteHealthProbeResultV1,
} from "./p2p/udp_swarm_direct_route_health_probe_v1.js";
import {
  VOID_P2P_DIRECT_UPGRADE_EPHEMERAL_PORT_MAX_V1,''',
    '''import {
  VoidUdpSwarmDirectRouteHealthProbeV1,
  buildVoidUdpSwarmDirectRouteHealthPongV1,
  normalizeVoidUdpSwarmDirectRouteHealthProbeMessageV1,
  type VoidUdpSwarmDirectRouteHealthProbeMessageV1,
  type VoidUdpSwarmDirectRouteHealthProbeResultV1,
} from "./p2p/udp_swarm_direct_route_health_probe_v1.js";
import {
  VoidUdpSwarmRelayRetirementExecutorV1,
  type VoidUdpSwarmRelayRetirementBindingV1,
  type VoidUdpSwarmRelayRetirementRevalidationV1,
} from "./p2p/udp_swarm_relay_retirement_executor_v1.js";
import {
  VOID_P2P_DIRECT_UPGRADE_EPHEMERAL_PORT_MAX_V1,''',
    "executor import",
)

replace_once(
    '''type UdpSwarmPromotedDirectRouteHealthContextV1 = {
  session_id: string;
  peer_node_id: string;
  direct_peer: Peer;
  observer: VoidUdpSwarmDirectRouteHealthObserverV1;
  probe: VoidUdpSwarmDirectRouteHealthProbeV1;
  next_probe_at_ms: number;
};''',
    '''type UdpSwarmPromotedDirectRouteHealthContextV1 = {
  session_id: string;
  peer_node_id: string;
  direct_peer: Peer;
  observer: VoidUdpSwarmDirectRouteHealthObserverV1;
  probe: VoidUdpSwarmDirectRouteHealthProbeV1;
  retirement: VoidUdpSwarmRelayRetirementExecutorV1;
  next_probe_at_ms: number;
  relay_retired_at_ms: number | null;
  relay_retirement_last_error: string | null;
};''',
    "health context type",
)

replace_once(
    '''          this.udpSwarmControl.sweep();
          this.sweepDirectUpgradeState();
          this.sweepUdpSwarmPromotedDirectRouteHealthV1();''',
    '''          this.udpSwarmControl.sweep();
          this.sweepDirectUpgradeState();
          this.sweepUdpSwarmPromotedRelayRetirementV1();
          this.sweepUdpSwarmPromotedDirectRouteHealthV1();''',
    "maintenance retirement sweep",
)

replace_once(
    '''  let healthObserver: VoidUdpSwarmDirectRouteHealthObserverV1;
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
  }''',
    '''  let healthObserver: VoidUdpSwarmDirectRouteHealthObserverV1;
  let healthProbe: VoidUdpSwarmDirectRouteHealthProbeV1;
  let relayRetirement: VoidUdpSwarmRelayRetirementExecutorV1;
  try {
    healthObserver = new VoidUdpSwarmDirectRouteHealthObserverV1({
      sessionId,
      expectedPeerNodeId: context.expected_peer_node_id,
      relayNodeId: context.relay_node_id,
      relayStreamId: context.relay_stream_id,
      promotedAtMs,
    });
    healthProbe = new VoidUdpSwarmDirectRouteHealthProbeV1(sessionId);
    relayRetirement = new VoidUdpSwarmRelayRetirementExecutorV1({
      session_id: sessionId,
      expected_peer_node_id: context.expected_peer_node_id,
      relay_node_id: context.relay_node_id,
      relay_stream_id: context.relay_stream_id,
    });
  } catch {
    return { ok: false, error: "health_state_initialization_failed" };
  }''',
    "promotion retirement initialization",
)

replace_once(
    '''      observer: healthObserver,
      probe: healthProbe,
      next_probe_at_ms: promotedAtMs,
    },''',
    '''      observer: healthObserver,
      probe: healthProbe,
      retirement: relayRetirement,
      next_probe_at_ms: promotedAtMs,
      relay_retired_at_ms: null,
      relay_retirement_last_error: null,
    },''',
    "promotion health state mount",
)

methods = r'''
private udpSwarmPromotedRelayRetirementRevalidationV1(
  context: UdpSwarmPromotedDirectRouteHealthContextV1,
  nowMs: number,
): VoidUdpSwarmRelayRetirementRevalidationV1 {
  const binding = context.retirement.snapshot().binding;
  const routeState =
    this.udpSwarmPromotedDirectRouteHealthStateV1(context);
  const fallback =
    this.udpSwarmPromotedRelayFallbacks.get(binding.expected_peer_node_id);
  const exactDirectRouteBindingLive =
    this.udpSwarmPromotedDirectRouteHealth.get(
      binding.expected_peer_node_id,
    ) === context &&
    this.peers.get(binding.expected_peer_node_id) === context.direct_peer &&
    context.direct_peer.id === binding.expected_peer_node_id &&
    routeState.direct_route_live &&
    routeState.authenticated_peer_node_id === binding.expected_peer_node_id &&
    routeState.direct_route_transport === "direct";
  const exactRelayFallbackBindingLive =
    !!fallback &&
    fallback.session_id === binding.session_id &&
    fallback.peer_node_id === binding.expected_peer_node_id &&
    fallback.relay_node_id === binding.relay_node_id &&
    fallback.relay_stream_id === binding.relay_stream_id &&
    fallback.direct_peer === context.direct_peer &&
    this.exactLiveRelayPeerForUdpSwarmV1(
      fallback.relay_peer,
      binding.expected_peer_node_id,
      binding.relay_node_id,
      binding.relay_stream_id,
    ) === fallback.relay_peer;
  return Object.freeze({
    session_id: binding.session_id,
    expected_peer_node_id: binding.expected_peer_node_id,
    authenticated_peer_node_id: routeState.authenticated_peer_node_id,
    relay_node_id: binding.relay_node_id,
    relay_stream_id: binding.relay_stream_id,
    direct_route_live: routeState.direct_route_live,
    direct_route_transport: routeState.direct_route_transport,
    relay_fallback_live: routeState.relay_fallback_live,
    exact_direct_route_binding_live: exactDirectRouteBindingLive,
    exact_relay_fallback_binding_live: exactRelayFallbackBindingLive,
    health_policy_decision: context.observer.evaluate(routeState, nowMs),
  });
}

private retireExactUdpSwarmPromotedRelayFallbackV1(
  context: UdpSwarmPromotedDirectRouteHealthContextV1,
  binding: VoidUdpSwarmRelayRetirementBindingV1,
  nowMs: number,
): boolean {
  const current =
    this.udpSwarmPromotedRelayRetirementRevalidationV1(context, nowMs);
  if (
    current.session_id !== binding.session_id ||
    current.expected_peer_node_id !== binding.expected_peer_node_id ||
    current.relay_node_id !== binding.relay_node_id ||
    current.relay_stream_id !== binding.relay_stream_id ||
    current.authenticated_peer_node_id !== binding.expected_peer_node_id ||
    !current.direct_route_live ||
    current.direct_route_transport !== "direct" ||
    !current.relay_fallback_live ||
    !current.exact_direct_route_binding_live ||
    !current.exact_relay_fallback_binding_live ||
    current.health_policy_decision.action !== "authorize_relay_retirement" ||
    current.health_policy_decision.relay_retirement_authorized !== true
  ) return false;

  const fallback =
    this.udpSwarmPromotedRelayFallbacks.get(binding.expected_peer_node_id);
  if (
    !fallback ||
    fallback.session_id !== binding.session_id ||
    fallback.peer_node_id !== binding.expected_peer_node_id ||
    fallback.relay_node_id !== binding.relay_node_id ||
    fallback.relay_stream_id !== binding.relay_stream_id ||
    fallback.direct_peer !== context.direct_peer ||
    this.exactLiveRelayPeerForUdpSwarmV1(
      fallback.relay_peer,
      binding.expected_peer_node_id,
      binding.relay_node_id,
      binding.relay_stream_id,
    ) !== fallback.relay_peer
  ) return false;

  if (
    !this.udpSwarmPromotedRelayFallbacks.delete(
      binding.expected_peer_node_id,
    )
  ) return false;

  fallback.relay_peer.suppressReconnect = true;
  fallback.relay_peer.socket.destroy();
  console.warn("VOID_P2P_UDP_SWARM_RELAY_RETIREMENT_V1_RETIRED", {
    peer_node_id: binding.expected_peer_node_id,
    session_id: binding.session_id,
    relay_node_id: binding.relay_node_id,
    relay_stream_id: binding.relay_stream_id,
  });
  return true;
}

private sweepUdpSwarmPromotedRelayRetirementV1(
  nowMs = Date.now(),
): { retirements_performed: number; terminal_failures: number } {
  let retirementsPerformed = 0;
  let terminalFailures = 0;
  for (const context of this.udpSwarmPromotedDirectRouteHealth.values()) {
    if (context.retirement.snapshot().phase !== "pending") continue;
    const result = context.retirement.execute({
      revalidate: () =>
        this.udpSwarmPromotedRelayRetirementRevalidationV1(
          context,
          nowMs,
        ),
      retireExactRelayFallback: (binding) =>
        this.retireExactUdpSwarmPromotedRelayFallbackV1(
          context,
          binding,
          nowMs,
        ),
    });
    if (result.ok === true) {
      context.relay_retired_at_ms = nowMs;
      context.relay_retirement_last_error = null;
      retirementsPerformed += 1;
      continue;
    }
    if (!result.terminal) continue;
    context.relay_retirement_last_error = result.error;
    terminalFailures += 1;
    console.warn("VOID_P2P_UDP_SWARM_RELAY_RETIREMENT_V1_TERMINAL_FAILURE", {
      peer_node_id: context.peer_node_id,
      session_id: context.session_id,
      error: result.error,
      relay_retirement_performed: result.relay_retirement_performed,
    });
  }
  return {
    retirements_performed: retirementsPerformed,
    terminal_failures: terminalFailures,
  };
}
'''

replace_once(
    '''  return {
    probes_sent: probesSent,
    failures_recorded: failuresRecorded,
  };
}

udpSwarmPromotedDirectRouteHealthSnapshotV1(nowMs = Date.now()) {''',
    '''  return {
    probes_sent: probesSent,
    failures_recorded: failuresRecorded,
  };
}

''' + methods + '''
udpSwarmPromotedDirectRouteHealthSnapshotV1(nowMs = Date.now()) {''',
    "retirement helper insertion",
)

replace_once(
    '''      const observer = context.observer.snapshot();
      const probe = context.probe.snapshot();
      return {''',
    '''      const observer = context.observer.snapshot();
      const probe = context.probe.snapshot();
      const retirement = context.retirement.snapshot();
      return {''',
    "health snapshot retirement state",
)

replace_once(
    '''        relay_retirement_authorized:
          policyDecision.relay_retirement_authorized,
        relay_retirement_performed: false as const,
      };''',
    '''        relay_retirement_authorized:
          policyDecision.relay_retirement_authorized,
        relay_retirement_phase: retirement.phase,
        relay_retirement_callback_attempted:
          retirement.retirement_callback_attempted,
        relay_retirement_performed: retirement.relay_retirement_performed,
        relay_retired_at_ms: context.relay_retired_at_ms,
        relay_retirement_last_error: context.relay_retirement_last_error,
      };''',
    "health snapshot route retirement fields",
)

replace_once(
    '''  return {
    promoted_health_route_count: routes.length,
    routes,
    relay_retirement_performed: false as const,
  };
}''',
    '''  return {
    promoted_health_route_count: routes.length,
    routes,
    relay_retirement_performed: routes.some(
      (entry) => entry.relay_retirement_performed === true,
    ),
    relay_retirement_indeterminate: routes.some(
      (entry) => entry.relay_retirement_performed === null,
    ),
  };
}''',
    "health snapshot aggregate retirement fields",
)

PATH.write_text(text, encoding="utf-8")
print("VOID_P2P_UDP_SWARM_NODE_RELAY_RETIREMENT_MATERIALIZED_V1")
