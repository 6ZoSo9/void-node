# VOID P2P Authenticated Edge Wall v1

Status: **implemented as a sidecar wall, disabled by default; not deployed or enabled by this change**.

## Lane claim

This lane builds the network perimeter around the existing VOID P2P listener. It does not extend economic activation, public earning, Buy VOID fulfillment, validator submission/recovery, native block execution, or account-state mutation. It does not modify `src/index.ts` and it does not change the existing P2P wire protocol.

The wall is deliberately a separate process. Existing VOID peer bytes enter and leave only through a loopback backend connection after the remote edge session has authenticated. That makes this a wall rather than another route, hook, or monolithic code insertion.

## Security boundary

The public side uses TLS 1.3 only. Every wall instance has a self-signed Ed25519 certificate whose SubjectPublicKeyInfo SHA-256 digest is the stable 64-hex edge node ID. Certificate-chain trust is not delegated to the public Web PKI. Instead, the wall requires all of the following:

1. The peer presents an Ed25519 certificate during mutual TLS.
2. The peer proves possession of the certificate private key with signed application messages.
3. The signed challenge, authentication, and acceptance transcript is bound to TLS exporter keying material.
4. Both peers assert the exact same VOID network ID.
5. The remote node ID passes a pinned target check and the local allow/deny admission policy.
6. Fresh nonces, timestamps, and replay tracking prevent transcript reuse.

`rejectUnauthorized: false` is intentional for self-certifying identities; it does **not** make authentication optional. The certificate is required, its key is the node identity, signatures are verified, the TLS channel is bound into the transcript, and admission fails closed.

## Admission policy

Admission must fail closed by default. At least one exact node ID must be present in `allow_node_ids`. Permissionless admission is available only through the explicit `VOID_P2P_EDGE_WALL_PERMISSIONLESS=1` setting. A deny entry always wins.

Outbound targets should set `expected_node_id`; this pins the remote TLS certificate identity before local backend access is possible.

## Containment

The v1 wall enforces these hard boundaries:

- TLS minimum and maximum are both TLS 1.3.
- The existing VOID P2P backend must be loopback-only.
- The wall status endpoint must be loopback-only.
- No unauthenticated peer can open a backend connection.
- Duplicate simultaneous sessions for one remote node ID are rejected with an identity reservation that closes the connection race.
- Total sessions, per-IP sockets, pending handshakes, authentication-line size, handshake time, idle time, and backend-connect time are bounded.
- Repeated failures enter exponential quarantine with a configured cap.
- Audit records contain identities, events, counts, and reasons, but never private-key material.

## Authority exclusions

- **No ledger authority.** The wall cannot commit a block or mutate canonical state.
- **No validator authority.** The wall cannot register, activate, submit, recover, or rotate a validator.
- **No wallet or signer authority.** The wall does not read a transaction signer, wallet key, or node consensus key.
- **No economic authority.** The wall does not credit WC, fulfill Buy VOID, broadcast transactions, or move money.
- **No protocol rewriting.** After authentication, bytes are bridged unchanged between the edge TLS socket and the existing loopback P2P listener.

## Components

- `src/p2p/authenticated_edge_wall_v1.ts` — dependency-free TLS wall, admission, quarantine, reconnect, status, audit, and byte bridge.
- `src/p2p/run_authenticated_edge_wall_v1.ts` — environment-driven executable with an explicit enable gate.
- `ops/mainnet0/provision-p2p-authenticated-edge-wall-v1.sh` — non-overwriting Ed25519 identity provisioner.
- `ops/mainnet0/run-p2p-authenticated-edge-wall-v1.sh` — fail-closed launcher.
- `ops/mainnet0/p2p-authenticated-edge-wall-v1.env.example` — disabled configuration template.
- `ops/mainnet0/void-p2p-authenticated-edge-wall-v1.service.example` — hardened systemd example.
- `scripts/prove_p2p_authenticated_edge_wall_v1.ts` — end-to-end and negative-path runtime proof.
- `scripts/prove_p2p_authenticated_edge_wall_guard_v1.ts` — static authority and boundary guard.

## Authentication transcript

The server signs `VOID_P2P_EDGE_CHALLENGE_V1` with its Ed25519 identity. The challenge includes protocol version, network ID, server node ID, random server nonce, timestamp, and SHA-256 of TLS exporter material.

The client validates the server certificate identity and challenge, then signs `VOID_P2P_EDGE_AUTH_V1`. Its response binds both node IDs, both nonces, the challenge hash, the same TLS exporter hash, network ID, protocol version, and timestamp.

The server verifies policy, signature, freshness, channel binding, and replay state. It then signs `VOID_P2P_EDGE_ACCEPT_V1`, which binds the full transcript hash and deterministic session ID. Only after that acceptance is written does either wall open its local backend socket.

## Status surface

`GET /__void/p2p-authenticated-edge-wall-v1/status` reports:

- local edge identity and network ID;
- bound listener, backend, and status addresses;
- pending and active session counts;
- per-session direction, remote identity, age, idle time, and byte counts;
- rejection, policy, backend, duplicate-session, reconnect, and traffic counters;
- active quarantine records;
- explicit statements that the wall has no ledger, validator, wallet, or signer authority.

The status listener refuses non-loopback configuration.

## Proof contract

The runtime proof provisions temporary Ed25519 identities and temporary TCP backends, then proves:

1. Two allowlisted walls establish a TLS 1.3 authenticated session.
2. Bytes flow unchanged in both directions between the two local backends.
3. The loopback status endpoint reports the authenticated session and authority boundaries.
4. A same-network but non-allowlisted peer is rejected before either backend is opened.
5. An allowlisted peer with the wrong network ID is rejected before either backend is opened.
6. Empty fail-closed admission, remote status binding, and remote backend binding are rejected at construction.

The guard proof confirms the implementation retains TLS/channel-binding/admission boundaries and does not import or reference the economic, validator, wallet, account-store, native-transfer, or monolithic index lanes.

## Operator sequence

Provision an edge identity without overwriting existing material:

```bash
ops/mainnet0/provision-p2p-authenticated-edge-wall-v1.sh "$HOME/.void/p2p-edge-wall-v1"
```

Copy the environment example to an operator-owned file, add exact allowed node IDs and any pinned dial targets, and keep `VOID_P2P_EDGE_WALL_ENABLED=0` while validating paths and ports. The existing VOID node P2P listener must be bound to loopback before the wall becomes the public listener.

Run the proofs before any enablement:

```bash
npx tsx scripts/prove_p2p_authenticated_edge_wall_v1.ts
npx tsx scripts/prove_p2p_authenticated_edge_wall_guard_v1.ts
npm run build
chmod +x tools/check_index_size.sh
tools/check_index_size.sh
```

Only after an operator separately changes the environment gate to `VOID_P2P_EDGE_WALL_ENABLED=1` should the sidecar start. This implementation does not perform that change, install the service, restart the node, alter firewall rules, or expose a public port.

## Rollout wall sections

The implementation is one coherent wall but rollout remains staged:

1. **Offline proof:** temporary identities and loopback backends only.
2. **Local shadow:** wall process enabled on loopback with a disposable backend, no public listener.
3. **Two-box private mesh:** pinned identities over a private address, existing backend still loopback-only.
4. **Public edge:** operator firewall exposes only the wall port; raw P2P stays loopback-only.
5. **Mesh expansion:** add pinned/allowlisted peers with bounded connection limits and audit review.

No stage is automatically activated by the code or installer.
