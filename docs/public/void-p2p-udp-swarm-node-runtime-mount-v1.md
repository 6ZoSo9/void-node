# VOID P2P UDP swarm Node runtime mount v1

Status: source-only, exact opt-in, relay-preserving.

## What this mount does

The mount composes the existing authenticated UDP swarm control plane, the
single-socket UDP runtime, the secure reliable UDP peer-socket adapter, and the
existing Node candidate staging/promotion path. A successful direct path still
must complete normal VOID `HELLO`/`AUTH` before it may replace the normal peer
route. The exact live relay route is retained as fallback.

With the separate exact orchestration opt-in, the mount can now create bounded
relay reservations and connections and initiate the UDP upgrade for configured
relay/target pairs. It does not discover those identities, configure a router,
forward a port, persist direct-route evidence, or retire a relay. It does not
deploy or restart a node.

## Environment

The runtime is off unless `VOID_P2P_UDP_SWARM_RUNTIME_ENABLED=1` is exact.
Malformed flags or inconsistent relay configuration fail startup before the
UDP socket is mounted.

| Variable | Default | Meaning |
| --- | --- | --- |
| `VOID_P2P_UDP_SWARM_RUNTIME_ENABLED` | `0` | Mount one UDP swarm socket for this process. |
| `VOID_P2P_RELAY_SERVER_ENABLED` | `0` | Enable the existing TCP relay service in this Node. |
| `VOID_P2P_UDP_SWARM_FAMILY` | `udp4` | Socket family: exact `udp4` or `udp6`. |
| `VOID_P2P_UDP_SWARM_BIND_HOST` | `0.0.0.0` or `::` | Numeric bind address matching the family. |
| `VOID_P2P_UDP_SWARM_BIND_PORT` | `0` | Participant ephemeral port, or a relay's stable nonzero port. |
| `VOID_P2P_UDP_SWARM_ORCHESTRATION_ENABLED` | `0` | Exact opt-in for bounded reservation/connection/upgrade orchestration. |
| `VOID_P2P_UDP_SWARM_ORCHESTRATION_ROUTES` | empty | Up to eight exact `relay-node-id/target-node-id` field-test pairs. |
| `VOID_P2P_UDP_SWARM_RELAY_ENDPOINT` | empty | Rendezvous relay's matching numeric public `IP:port`; IPv6 uses `[IP]:port`. |

`VOID_P2P_UDP_SWARM_TEST_ALLOW_NONPUBLIC_ENDPOINTS=1` exists only for tests and
is rejected unless `NODE_ENV=test`.

### Ordinary participant

```dotenv
VOID_P2P_UDP_SWARM_RUNTIME_ENABLED=1
VOID_P2P_RELAY_SERVER_ENABLED=0
VOID_P2P_UDP_SWARM_FAMILY=udp4
VOID_P2P_UDP_SWARM_BIND_HOST=0.0.0.0
VOID_P2P_UDP_SWARM_BIND_PORT=0
VOID_P2P_UDP_SWARM_RELAY_ENDPOINT=
```

With orchestration disabled, the participant still needs an authenticated
direct connection to a relay and an existing live end-to-end relay stream to
its peer before an application may call `requestUdpSwarmUpgradeV1(...)`.

For a bounded source-only field test, the orchestration variables may supply
exact relay/target identities as documented in
`void-p2p-udp-swarm-relay-orchestrator-v1.md`. Manual identity configuration is
not the final public onboarding path and does not close issue #1005.

### Rendezvous relay

```dotenv
VOID_P2P_UDP_SWARM_RUNTIME_ENABLED=1
VOID_P2P_RELAY_SERVER_ENABLED=1
VOID_P2P_UDP_SWARM_FAMILY=udp4
VOID_P2P_UDP_SWARM_BIND_HOST=0.0.0.0
VOID_P2P_UDP_SWARM_BIND_PORT=4701
VOID_P2P_UDP_SWARM_RELAY_ENDPOINT=203.0.113.10:4701
```

Replace the example address and port with a real numeric public endpoint that
routes to the same socket. The mount validates family and port equality; the
existing control bridge applies the public-endpoint policy.

## Read-only status

`GET /p2p/udp-swarm/runtime-v1` returns bind class/port, aggregate session
phases, datagram counters, orchestration route count/counters,
candidate/promotion counts, failure counters, and the immutable authority
statement. It intentionally omits node IDs, peer IDs, session IDs, stream IDs,
observed endpoints, configured endpoint text, and key material.

The endpoint is observational only. It cannot start an upgrade, reserve a
relay, mutate routing, retire fallback, or change runtime configuration.

## Proof

```bash
npx --no-install tsx scripts/prove_void_p2p_udp_swarm_node_runtime_mount_v1.ts
npm run typecheck
npm run build
```

The proof creates three loopback Nodes and three real UDP sockets. The mounted
orchestrator automatically reserves the relay, connects the exact target, and
initiates the UDP upgrade. The proof then performs signed rendezvous through
the mounted callbacks, completes the secure UDP path and normal VOID peer
authentication, promotes the direct route, verifies sanitized status, destroys
the promoted direct socket, and confirms that the exact relay fallback resumes.

The loopback allowance is proof-only. No wallet, validator, WC, funds, signing,
router, firewall, deployment, service restart, or relay-retirement authority is
introduced.
