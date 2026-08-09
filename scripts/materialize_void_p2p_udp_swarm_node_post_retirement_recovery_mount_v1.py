#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

NODE_PATH = Path("src/node_core.ts")
WORKFLOW_PATH = Path(
    ".github/workflows/void-p2p-udp-swarm-node-post-retirement-recovery-mount-v1.yml"
)

text = NODE_PATH.read_text(encoding="utf-8")


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one anchor, found {count}")
    text = text.replace(old, new, 1)


if "evaluateVoidUdpSwarmPostRetirementRecoveryPolicyV1" in text:
    raise SystemExit("post-retirement recovery Node mount already appears materialized")

replace_once(
    '''import {
  VoidUdpSwarmRelayRetirementExecutorV1,
  type VoidUdpSwarmRelayRetirementBindingV1,
  type VoidUdpSwarmRelayRetirementRevalidationV1,
} from "./p2p/udp_swarm_relay_retirement_executor_v1.js";
import {
  VOID_P2P_DIRECT_UPGRADE_EPHEMERAL_PORT_MAX_V1,''',
    '''import {
  VoidUdpSwarmRelayRetirementExecutorV1,
  type VoidUdpSwarmRelayRetirementBindingV1,
  type VoidUdpSwarmRelayRetirementRevalidationV1,
} from "./p2p/udp_swarm_relay_retirement_executor_v1.js";
import {
  VOID_P2P_UDP_SWARM_POST_RETIREMENT_RECOVERY_RETRY_INTERVAL_MS_V1,
  evaluateVoidUdpSwarmPostRetirementRecoveryPolicyV1,
  type VoidUdpSwarmPostRetirementRecoveryDecisionV1,
} from "./p2p/udp_swarm_post_retirement_recovery_policy_v1.js";
import {
  VOID_P2P_DIRECT_UPGRADE_EPHEMERAL_PORT_MAX_V1,''',
    "recovery policy import",
)

replace_once(
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
};

const VOID_P2P_UDP_SWARM_PROMOTED_DIRECT_HEALTH_PROBE_INTERVAL_MS_V1 =''',
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
};

type UdpSwarmPostRetirementRecoveryContextV1 = {
  session_id: string;
  peer_node_id: string;
  relay_node_id: string;
  retired_relay_stream_id: string;
  relay_retired_at_ms: number;
  reacquisition_attempt_count: number;
  last_reacquisition_attempt_at_ms: number | null;
  local_admission_retry_at_ms: number | null;
  last_request_id: string | null;
  last_error: string | null;
  last_decision_reason: string | null;
};

const VOID_P2P_UDP_SWARM_PROMOTED_DIRECT_HEALTH_PROBE_INTERVAL_MS_V1 =''',
    "recovery context type",
)

replace_once(
    '''  private readonly udpSwarmPromotedDirectRouteHealth =
    new Map<string, UdpSwarmPromotedDirectRouteHealthContextV1>();

  private readonly directUpgradeEnabled: boolean;''',
    '''  private readonly udpSwarmPromotedDirectRouteHealth =
    new Map<string, UdpSwarmPromotedDirectRouteHealthContextV1>();
  private readonly udpSwarmPostRetirementRecovery =
    new Map<string, UdpSwarmPostRetirementRecoveryContextV1>();

  private readonly directUpgradeEnabled: boolean;''',
    "recovery map field",
)

replace_once(
    '''          this.sweepDirectUpgradeState();
          this.sweepUdpSwarmPromotedRelayRetirementV1();
          this.sweepUdpSwarmPromotedDirectRouteHealthV1();''',
    '''          this.sweepDirectUpgradeState();
          this.sweepUdpSwarmPromotedRelayRetirementV1();
          this.sweepUdpSwarmPostRetirementRecoveryV1();
          this.sweepUdpSwarmPromotedDirectRouteHealthV1();''',
    "maintenance recovery sweep",
)

replace_once(
    '''    this.udpSwarmDirectCandidates.clear();
    this.udpSwarmPromotedRelayFallbacks.clear();
    this.udpSwarmPromotedDirectRouteHealth.clear();
    for (const p of this.peers.values()) {''',
    '''    this.udpSwarmDirectCandidates.clear();
    this.udpSwarmPromotedRelayFallbacks.clear();
    this.udpSwarmPromotedDirectRouteHealth.clear();
    this.udpSwarmPostRetirementRecovery.clear();
    for (const p of this.peers.values()) {''',
    "stop recovery clear",
)

replace_once(
    '''      const closedNormalRoute = this.peers.get(peer.id) === peer;
      if (closedNormalRoute) this.peers.delete(peer.id);
      if (closedNormalRoute && peer.transport === "direct") {
        this.udpSwarmPromotedDirectRouteHealth.delete(peer.id);
        this.restoreUdpSwarmRelayFallbackAfterDirectCloseV1(peer);
      }
      if (peer.directUpgradeSessionId) {''',
    '''      const closedNormalRoute = this.peers.get(peer.id) === peer;
      if (closedNormalRoute) this.peers.delete(peer.id);
      if (closedNormalRoute && peer.transport === "direct") {
        this.captureUdpSwarmPostRetirementRecoveryAfterDirectCloseV1(peer);
      }
      if (peer.directUpgradeSessionId) {''',
    "direct close recovery capture",
)

methods = r'''
private captureUdpSwarmPostRetirementRecoveryAfterDirectCloseV1(
  peer: Peer,
): boolean {
  const healthContext = this.udpSwarmPromotedDirectRouteHealth.get(peer.id);
  const retirement = healthContext?.retirement.snapshot();
  this.udpSwarmPromotedDirectRouteHealth.delete(peer.id);

  const relayRestored = this.restoreUdpSwarmRelayFallbackAfterDirectCloseV1(peer);
  if (relayRestored) {
    this.udpSwarmPostRetirementRecovery.delete(peer.id);
    return false;
  }

  if (
    !healthContext ||
    !retirement ||
    retirement.phase !== "retired" ||
    retirement.retirement_callback_attempted !== true ||
    retirement.relay_retirement_performed !== true ||
    healthContext.relay_retired_at_ms === null ||
    retirement.binding.session_id !== healthContext.session_id ||
    retirement.binding.expected_peer_node_id !== peer.id ||
    healthContext.peer_node_id !== peer.id ||
    healthContext.direct_peer !== peer
  ) return false;

  const binding = retirement.binding;
  this.udpSwarmPostRetirementRecovery.set(peer.id, {
    session_id: binding.session_id,
    peer_node_id: binding.expected_peer_node_id,
    relay_node_id: binding.relay_node_id,
    retired_relay_stream_id: binding.relay_stream_id,
    relay_retired_at_ms: healthContext.relay_retired_at_ms,
    reacquisition_attempt_count: 0,
    last_reacquisition_attempt_at_ms: null,
    local_admission_retry_at_ms: null,
    last_request_id: null,
    last_error: null,
    last_decision_reason: null,
  });
  console.warn("VOID_P2P_UDP_SWARM_POST_RETIREMENT_RECOVERY_V1_ARMED", {
    peer_node_id: binding.expected_peer_node_id,
    session_id: binding.session_id,
    relay_node_id: binding.relay_node_id,
    retired_relay_stream_id: binding.relay_stream_id,
  });
  return true;
}

private udpSwarmPostRetirementNewerSessionPresentV1(
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

private udpSwarmPostRetirementRecoveryDecisionV1(
  context: UdpSwarmPostRetirementRecoveryContextV1,
  nowMs: number,
): VoidUdpSwarmPostRetirementRecoveryDecisionV1 {
  const routedPeer = this.peers.get(context.peer_node_id);
  const normalRouteLive = !!routedPeer &&
    routedPeer.handshakeDone &&
    !routedPeer.id.startsWith("?-") &&
    routedPeer.socket.destroyed !== true;
  const directRouteLive = normalRouteLive && routedPeer?.transport === "direct";

  const fallback = this.udpSwarmPromotedRelayFallbacks.get(context.peer_node_id);
  const relayFallbackLive = !!fallback &&
    this.exactLiveRelayPeerForUdpSwarmV1(
      fallback.relay_peer,
      fallback.peer_node_id,
      fallback.relay_node_id,
      fallback.relay_stream_id,
    ) === fallback.relay_peer;

  const retiredRelayStreamLive = this.relayStreams.has(
    this.relayStreamKey(
      context.relay_node_id,
      context.retired_relay_stream_id,
    ),
  );
  const replacementRelayStreamLive = [...this.relayStreams.values()].some(
    (entry) =>
      entry.relay_node_id === context.relay_node_id &&
      entry.remote_node_id === context.peer_node_id &&
      entry.stream_id !== context.retired_relay_stream_id,
  );
  const recoveryInFlight = [...this.relayPendingConnects.values()].some(
    (pending) =>
      pending.relay_node_id === context.relay_node_id &&
      pending.target_node_id === context.peer_node_id,
  );
  const relayControlPeer = this.authenticatedDirectPeer(context.relay_node_id);

  return evaluateVoidUdpSwarmPostRetirementRecoveryPolicyV1({
    session_id: context.session_id,
    expected_peer_node_id: context.peer_node_id,
    relay_node_id: context.relay_node_id,
    retired_relay_stream_id: context.retired_relay_stream_id,
    retirement_phase: "retired",
    retirement_callback_attempted: true,
    relay_retirement_performed: true,
    relay_retired_at_ms: context.relay_retired_at_ms,
    node_stopping: this.stopping,
    newer_udp_swarm_session_present:
      this.udpSwarmPostRetirementNewerSessionPresentV1(context),
    direct_route_live: directRouteLive,
    normal_route_live: normalRouteLive,
    relay_fallback_live: relayFallbackLive,
    retired_relay_stream_live: retiredRelayStreamLive,
    replacement_relay_stream_live: replacementRelayStreamLive,
    recovery_in_flight: recoveryInFlight,
    relay_control_route_live: !!relayControlPeer,
    relay_control_route_transport: relayControlPeer?.transport ?? null,
    authenticated_relay_control_node_id: relayControlPeer?.id ?? null,
    reacquisition_attempt_count: context.reacquisition_attempt_count,
    last_reacquisition_attempt_at_ms:
      context.last_reacquisition_attempt_at_ms,
    now_ms: nowMs,
  });
}

private sweepUdpSwarmPostRetirementRecoveryV1(
  nowMs = Date.now(),
): {
  contexts: number;
  attempts_started: number;
  attempts_rejected: number;
  contexts_cleared: number;
} {
  let attemptsStarted = 0;
  let attemptsRejected = 0;
  let contextsCleared = 0;

  for (const [peerNodeId, context] of this.udpSwarmPostRetirementRecovery) {
    const decision = this.udpSwarmPostRetirementRecoveryDecisionV1(
      context,
      nowMs,
    );
    context.last_decision_reason = decision.reason;

    if (
      decision.reason === "normal_route_already_live" ||
      decision.reason === "direct_route_still_live" ||
      decision.reason === "newer_udp_swarm_session_present" ||
      decision.reason === "relay_fallback_already_live"
    ) {
      this.udpSwarmPostRetirementRecovery.delete(peerNodeId);
      contextsCleared += 1;
      continue;
    }

    if (
      decision.action !== "authorize_fresh_relay_reacquisition" ||
      decision.next_attempt_number === null
    ) continue;

    if (
      context.local_admission_retry_at_ms !== null &&
      nowMs < context.local_admission_retry_at_ms
    ) {
      context.last_decision_reason =
        "local_relay_admission_retry_interval_not_elapsed";
      continue;
    }

    const requestId = this.connectViaRelay(
      context.relay_node_id,
      context.peer_node_id,
    );
    context.last_request_id = requestId ?? null;
    if (requestId) {
      context.reacquisition_attempt_count = decision.next_attempt_number;
      context.last_reacquisition_attempt_at_ms = nowMs;
      context.local_admission_retry_at_ms = null;
      context.last_error = null;
      attemptsStarted += 1;
      console.warn("VOID_P2P_UDP_SWARM_POST_RETIREMENT_RECOVERY_V1_REQUESTED", {
        peer_node_id: context.peer_node_id,
        session_id: context.session_id,
        relay_node_id: context.relay_node_id,
        retired_relay_stream_id: context.retired_relay_stream_id,
        request_id: requestId,
        attempt_number: context.reacquisition_attempt_count,
      });
    } else {
      const retryAtMs =
        nowMs +
        VOID_P2P_UDP_SWARM_POST_RETIREMENT_RECOVERY_RETRY_INTERVAL_MS_V1;
      context.local_admission_retry_at_ms = Number.isSafeInteger(retryAtMs)
        ? retryAtMs
        : Number.MAX_SAFE_INTEGER;
      context.last_error = "relay_connect_request_not_started";
      context.last_decision_reason = "local_relay_admission_rejected";
      attemptsRejected += 1;
    }
  }

  return {
    contexts: this.udpSwarmPostRetirementRecovery.size,
    attempts_started: attemptsStarted,
    attempts_rejected: attemptsRejected,
    contexts_cleared: contextsCleared,
  };
}

udpSwarmPostRetirementRecoverySnapshotV1(nowMs = Date.now()) {
  const recoveries = [...this.udpSwarmPostRetirementRecovery.values()]
    .map((context) => {
      const decision = this.udpSwarmPostRetirementRecoveryDecisionV1(
        context,
        nowMs,
      );
      return {
        session_id: context.session_id,
        peer_node_id: context.peer_node_id,
        relay_node_id: context.relay_node_id,
        retired_relay_stream_id: context.retired_relay_stream_id,
        relay_retired_at_ms: context.relay_retired_at_ms,
        reacquisition_attempt_count: context.reacquisition_attempt_count,
        last_reacquisition_attempt_at_ms:
          context.last_reacquisition_attempt_at_ms,
        local_admission_retry_at_ms: context.local_admission_retry_at_ms,
        local_admission_retry_active:
          context.local_admission_retry_at_ms !== null &&
          nowMs < context.local_admission_retry_at_ms,
        last_request_id: context.last_request_id,
        last_error: context.last_error,
        last_decision_reason: context.last_decision_reason,
        decision,
      };
    })
    .sort((a, b) => a.peer_node_id.localeCompare(b.peer_node_id));
  return {
    recovery_context_count: recoveries.length,
    recoveries,
    network_dial_performed: false as const,
    verified_direct_evidence_persisted: false as const,
    production_udp_activation_performed: false as const,
  };
}
'''

replace_once(
    '''udpSwarmPromotedDirectRouteHealthSnapshotV1(nowMs = Date.now()) {
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
      const retirement = context.retirement.snapshot();
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
        relay_retirement_phase: retirement.phase,
        relay_retirement_callback_attempted:
          retirement.retirement_callback_attempted,
        relay_retirement_performed: retirement.relay_retirement_performed,
        relay_retired_at_ms: context.relay_retired_at_ms,
        relay_retirement_last_error: context.relay_retirement_last_error,
      };
    })
    .sort((a, b) => a.peer_node_id.localeCompare(b.peer_node_id));
  return {
    promoted_health_route_count: routes.length,
    routes,
    relay_retirement_performed: routes.some(
      (entry) => entry.relay_retirement_performed === true,
    ),
    relay_retirement_indeterminate: routes.some(
      (entry) => entry.relay_retirement_performed === null,
    ),
  };
}

attachEphemeralDirectTransportV1(''',
    '''udpSwarmPromotedDirectRouteHealthSnapshotV1(nowMs = Date.now()) {
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
      const retirement = context.retirement.snapshot();
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
        relay_retirement_phase: retirement.phase,
        relay_retirement_callback_attempted:
          retirement.retirement_callback_attempted,
        relay_retirement_performed: retirement.relay_retirement_performed,
        relay_retired_at_ms: context.relay_retired_at_ms,
        relay_retirement_last_error: context.relay_retirement_last_error,
      };
    })
    .sort((a, b) => a.peer_node_id.localeCompare(b.peer_node_id));
  return {
    promoted_health_route_count: routes.length,
    routes,
    relay_retirement_performed: routes.some(
      (entry) => entry.relay_retirement_performed === true,
    ),
    relay_retirement_indeterminate: routes.some(
      (entry) => entry.relay_retirement_performed === null,
    ),
  };
}

''' + methods + '''
attachEphemeralDirectTransportV1(''',
    "recovery methods",
)

NODE_PATH.write_text(text, encoding="utf-8")

WORKFLOW_PATH.write_text(
    '''name: VOID P2P UDP swarm Node post-retirement recovery mount v1

on:
  pull_request:
    paths:
      - '.github/workflows/void-p2p-udp-swarm-node-post-retirement-recovery-mount-v1.yml'
      - 'src/node_core.ts'
      - 'src/p2p/udp_swarm_post_retirement_recovery_policy_v1.ts'
      - 'src/p2p/udp_swarm_relay_retirement_executor_v1.ts'
      - 'scripts/prove_void_p2p_udp_swarm_node_post_retirement_recovery_mount_v1.ts'
      - 'scripts/prove_void_p2p_udp_swarm_post_retirement_recovery_policy_v1.ts'
      - 'scripts/prove_void_p2p_udp_swarm_node_relay_retirement_mount_v1.ts'
  push:
    branches:
      - main
    paths:
      - '.github/workflows/void-p2p-udp-swarm-node-post-retirement-recovery-mount-v1.yml'
      - 'src/node_core.ts'
      - 'src/p2p/udp_swarm_post_retirement_recovery_policy_v1.ts'
      - 'src/p2p/udp_swarm_relay_retirement_executor_v1.ts'
      - 'scripts/prove_void_p2p_udp_swarm_node_post_retirement_recovery_mount_v1.ts'
      - 'scripts/prove_void_p2p_udp_swarm_post_retirement_recovery_policy_v1.ts'
      - 'scripts/prove_void_p2p_udp_swarm_node_relay_retirement_mount_v1.ts'

permissions:
  contents: read

jobs:
  prove:
    name: prove (Node ${{ matrix.node-version }})
    runs-on: ubuntu-24.04
    timeout-minutes: 25
    strategy:
      fail-fast: false
      matrix:
        node-version: [22, 24, 26]
    steps:
      - name: Checkout exact source head
        uses: actions/checkout@v6
        with:
          ref: ${{ github.event_name == 'pull_request' && github.event.pull_request.head.sha || github.sha }}
          fetch-depth: 0
          persist-credentials: false
      - name: Setup Node ${{ matrix.node-version }}
        uses: actions/setup-node@v6
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - name: Install locked dependencies
        run: npm ci --ignore-scripts --no-audit --no-fund
      - name: Prove Node post-retirement recovery mount
        run: npx --no-install tsx scripts/prove_void_p2p_udp_swarm_node_post_retirement_recovery_mount_v1.ts
      - name: Re-prove recovery policy
        run: npx --no-install tsx scripts/prove_void_p2p_udp_swarm_post_retirement_recovery_policy_v1.ts
      - name: Re-prove Node relay retirement mount
        run: npx --no-install tsx scripts/prove_void_p2p_udp_swarm_node_relay_retirement_mount_v1.ts
      - name: Re-prove relay retirement executor
        run: npx --no-install tsx scripts/prove_void_p2p_udp_swarm_relay_retirement_executor_v1.ts
      - name: Re-prove Node direct-route health mount
        run: npx --no-install tsx scripts/prove_void_p2p_udp_swarm_node_direct_route_health_mount_v1.ts
      - name: Re-prove Node candidate promotion
        run: npx --no-install tsx scripts/prove_void_p2p_udp_swarm_node_candidate_promotion_v1.ts
      - name: Typecheck repository
        run: npm run typecheck
      - name: Build repository
        run: npm run build
      - name: Working-tree diff hygiene
        run: git diff --check
      - name: Pull-request committed-range diff hygiene
        if: github.event_name == 'pull_request'
        run: git diff --check "${{ github.event.pull_request.base.sha }}...HEAD"
''',
    encoding="utf-8",
)

print("VOID_P2P_UDP_SWARM_NODE_POST_RETIREMENT_RECOVERY_MOUNT_V1_MATERIALIZED")