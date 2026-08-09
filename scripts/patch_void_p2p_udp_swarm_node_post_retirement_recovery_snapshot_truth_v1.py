#!/usr/bin/env python3
from pathlib import Path

NODE = Path("src/node_core.ts")
PROOF = Path("scripts/prove_void_p2p_udp_swarm_node_post_retirement_recovery_mount_v1.ts")

node = NODE.read_text(encoding="utf-8")
proof = PROOF.read_text(encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one anchor, found {count}")
    return text.replace(old, new, 1)

if "active_recovery_network_attempts_started" in node:
    print("VOID_P2P_UDP_SWARM_NODE_POST_RETIREMENT_RECOVERY_SNAPSHOT_TRUTH_V1_ALREADY_APPLIED")
    raise SystemExit(0)

node = replace_once(
    node,
    '''  return {\n    recovery_context_count: recoveries.length,\n    recoveries,\n    network_dial_performed: false as const,\n    verified_direct_evidence_persisted: false as const,\n    production_udp_activation_performed: false as const,\n  };''',
    '''  const activeRecoveryNetworkAttemptsStarted = recoveries.reduce(\n    (total, entry) => total + entry.reacquisition_attempt_count,\n    0,\n  );\n  return {\n    recovery_context_count: recoveries.length,\n    recoveries,\n    active_recovery_network_attempts_started:\n      activeRecoveryNetworkAttemptsStarted,\n    verified_direct_evidence_persisted: false as const,\n    production_udp_activation_performed: false as const,\n  };''',
    "runtime snapshot authority surface",
)

proof = replace_once(
    proof,
    '''    assert.equal(armed.network_dial_performed, false);\n    assert.equal(armed.verified_direct_evidence_persisted, false);''',
    '''    assert.equal(armed.active_recovery_network_attempts_started, 0);\n    assert.equal(armed.verified_direct_evidence_persisted, false);''',
    "armed snapshot assertion",
)

proof = replace_once(
    proof,
    '''    assert.equal(firstStarted.recoveries[0]?.local_admission_retry_at_ms, null);\n\n    const firstPending = core.relayPendingConnects.get(firstConnect.request_id);''',
    '''    assert.equal(firstStarted.recoveries[0]?.local_admission_retry_at_ms, null);\n    assert.equal(firstStarted.active_recovery_network_attempts_started, 1);\n\n    const firstPending = core.relayPendingConnects.get(firstConnect.request_id);''',
    "first attempt snapshot assertion",
)

proof = replace_once(
    proof,
    '''    assert.equal(exhausted.recoveries[0]?.reacquisition_attempt_count, 3);\n    assert.equal(\n      exhausted.recoveries[0]?.decision.reason,''',
    '''    assert.equal(exhausted.recoveries[0]?.reacquisition_attempt_count, 3);\n    assert.equal(exhausted.active_recovery_network_attempts_started, 3);\n    assert.equal(\n      exhausted.recoveries[0]?.decision.reason,''',
    "exhausted snapshot assertion",
)

proof = replace_once(
    proof,
    '''    assert.equal(core.udpSwarmPostRetirementRecovery.size, 0);\n    assert.equal(relayConnectCount(fixture.sent, fixture.relayControlPeer), 3);''',
    '''    assert.equal(core.udpSwarmPostRetirementRecovery.size, 0);\n    assert.equal(\n      node.udpSwarmPostRetirementRecoverySnapshotV1(exhaustedAtMs + 1)\n        .active_recovery_network_attempts_started,\n      0,\n    );\n    assert.equal(relayConnectCount(fixture.sent, fixture.relayControlPeer), 3);''',
    "cleared snapshot assertion",
)

NODE.write_text(node, encoding="utf-8")
PROOF.write_text(proof, encoding="utf-8")
print("VOID_P2P_UDP_SWARM_NODE_POST_RETIREMENT_RECOVERY_SNAPSHOT_TRUTH_V1_PATCHED")
