# VOID P2P Node-Bound Activation Permit Wall v1

## Status

This wall is **disabled by default**, is not deployed by this change, and does not alter the existing raw P2P listener. It is a supervisor above the signed trust-policy wall. The repository change does not install a service, open a port, change firewall rules, generate a production identity, copy an authority private key, enable a runtime, or move money.

The wall is intentionally one-shot. A consumed permit cannot be replayed after a crash or operator stop. Restarting the supervisor requires a fresh successor permit with the next sequence and the exact predecessor hash. The example service therefore uses `Restart=no`.

## Why this wall exists

The authenticated edge wall answers: **which cryptographic node is connecting?**

The signed trust-policy wall answers: **which authenticated nodes are members of this mesh policy?**

Neither answer is the same as: **may this specific local node activate this exact policy with this exact configuration now?**

This wall separates membership authority from activation authority. Membership remains controlled by the threshold-signed trust policy. Activation is controlled by a distinct threshold-signed permit root set. Compromise of one authority domain does not silently become authority in the other domain.

## Permit binding

Every permit is signed over a canonical JSON document in a dedicated signing domain and binds all of the following:

- exact VOID network ID;
- exact local edge node ID derived from the Ed25519 certificate public key;
- monotonic one-shot permit sequence;
- bounded `issued_at`, `not_before`, and `expires_at` instants;
- exact predecessor permit SHA-256 after sequence 1;
- exact signed trust-policy epoch;
- exact canonical signed policy SHA-256;
- exact canonical signed policy-envelope SHA-256;
- exact canonical trust-root-set SHA-256;
- exact canonical runtime-profile SHA-256.

The runtime profile binds both state directories and every local edge setting that is not membership policy:

- activation-permit state directory;
- signed trust-policy state directory;
- listen mode, host, and port;
- loopback-only backend host and port;
- loopback-only status host and port;
- edge identity key and certificate paths;
- audit path;
- handshake, idle, backend-connect, connection, line-size, quarantine, and reconnect limits.

The profile contains no allowlist, denylist, peer list, permissionless flag, or policy network override. Those remain exclusively under signed membership policy.

## Admission sequence

The `serve` command fails closed unless all three explicit gates equal `1`:

```text
VOID_P2P_ACTIVATION_PERMIT_WALL_ENABLED=1
VOID_P2P_TRUST_POLICY_WALL_ENABLED=1
VOID_P2P_EDGE_WALL_ENABLED=1
```

It then performs this order:

1. Read and verify the threshold-signed trust policy under locally pinned trust roots.
2. Parse and canonicalize the runtime profile.
3. Derive the edge node ID from the certificate public key without reading the edge private key.
4. Verify the threshold-signed activation permit against the network, node, policy, trust roots, profile, and validity window.
5. Acquire a create-exclusive local consumption lock.
6. Reject rollback, replay, sequence gaps, wrong predecessors, foreign state, unsafe symlinks, and corrupted current generations.
7. Fsync a new immutable generation containing the permit envelope, activation-permit roots, trust-policy envelope, trust roots, runtime profile, and consumption record.
8. Atomically switch the relative `current` symlink and append an fsynced audit record.
9. Spawn the signed trust-policy supervisor with the sealed generation files and profile-derived environment.

Consumption occurs before spawn. If spawn fails, the permit remains consumed. This is deliberate: ambiguous partial starts never make a permit reusable. Recovery requires a fresh successor permit.

## Authority boundaries

The wall can authorize one local supervisor start. It does not provide any of the following:

- remote policy or permit mutation API;
- public HTTP or JSON-RPC endpoint;
- P2P protocol parsing or forwarding of its own;
- ledger or validator mutation authority;
- wallet or transaction signer authority;
- transaction construction, signing, submission, or broadcasting;
- canonical block or state-transition authority;
- service installation or runtime deployment;
- firewall mutation or public-port exposure;
- automatic restart after a consumed permit;
- production authority-key storage on the runtime node.

The offline activation-permit private keys must remain outside the runtime host. The runtime needs only the public root set and a signed permit envelope.

## Canonical runtime profile

Start from the disabled environment example, set the intended local paths and limits, and generate the profile explicitly:

```bash
export VOID_P2P_ACTIVATION_PERMIT_PROFILE_GENERATION=1
export VOID_P2P_ACTIVATION_RUNTIME_PROFILE_OUTPUT="$PWD/runtime-profile-v1.json"

npx tsx src/p2p/run_node_bound_activation_permit_wall_v1.ts profile \
  --output "$VOID_P2P_ACTIVATION_RUNTIME_PROFILE_OUTPUT"
```

The output is create-exclusive. Existing files are never overwritten. The command prints the exact canonical profile hash without reading a policy private key or performing network access.

## Offline activation authority

Provision one Ed25519 activation authority in an offline environment:

```bash
bash ops/mainnet0/provision-p2p-activation-permit-authority-v1.sh \
  "$HOME/.void/p2p-activation-permit-authority-v1" \
  void-mainnet0-chain2050
```

The provisioner is non-overwriting and creates a one-key root set. For a threshold set, provision isolated authorities separately, create a manifest containing only public-key paths, and combine them offline:

```json
{
  "network_id": "void-mainnet0-chain2050",
  "threshold": 2,
  "public_key_files": [
    "/offline/a/activation-permit-authority-ed25519.pub.pem",
    "/offline/b/activation-permit-authority-ed25519.pub.pem",
    "/offline/c/activation-permit-authority-ed25519.pub.pem"
  ]
}
```

```bash
export VOID_P2P_ACTIVATION_PERMIT_OFFLINE_ROOT_SET=1
npx tsx src/p2p/run_node_bound_activation_permit_wall_v1.ts root-set \
  --manifest /offline/activation-root-manifest.json \
  --output /offline/activation-permit-root-set-v1.json
```

Copy only the resulting public root set to the runtime node. Do not copy any activation authority private key.

## Permit document

A sequence-1 permit has no predecessor field:

```json
{
  "schema": "void-p2p-node-bound-activation-permit-v1",
  "network_id": "void-mainnet0-chain2050",
  "edge_node_id": "<64 lowercase hex>",
  "sequence": "1",
  "issued_at": "2026-07-22T22:30:00.000Z",
  "not_before": "2026-07-22T22:31:00.000Z",
  "expires_at": "2026-07-23T22:31:00.000Z",
  "policy_epoch": "1",
  "policy_sha256": "<64 lowercase hex>",
  "policy_envelope_sha256": "<64 lowercase hex>",
  "trust_root_set_sha256": "<64 lowercase hex>",
  "runtime_profile_sha256": "<64 lowercase hex>"
}
```

Sequence 2 and later must include:

```json
"previous_permit_sha256": "<exact canonical SHA-256 of the immediately consumed permit>"
```

All decimal values are canonical positive decimal strings. All timestamps are canonical UTC millisecond instants. Extra fields are rejected.

## Offline signing

Each authority adds one signature to a bare permit or existing envelope. Use a new output path for every signature step:

```bash
export VOID_P2P_ACTIVATION_PERMIT_OFFLINE_SIGNING=1

npx tsx src/p2p/run_node_bound_activation_permit_wall_v1.ts sign \
  --input /offline/permit-v1.json \
  --private-key /offline/a/activation-permit-authority-ed25519.key.pem \
  --output /offline/permit-v1.a.json

npx tsx src/p2p/run_node_bound_activation_permit_wall_v1.ts sign \
  --input /offline/permit-v1.a.json \
  --private-key /offline/b/activation-permit-authority-ed25519.key.pem \
  --output /offline/permit-v1.ab.json
```

The signing command has no network behavior. It never prints private key material.

## Runtime verification and explicit consumption

Verification is read-only:

```bash
npx tsx src/p2p/run_node_bound_activation_permit_wall_v1.ts verify
```

A consumption-only ceremony is separately gated and does not start the edge wall:

```bash
export VOID_P2P_ACTIVATION_PERMIT_CONSUMPTION_ENABLED=1
npx tsx src/p2p/run_node_bound_activation_permit_wall_v1.ts consume
```

Production cutover should use the hardened service supervisor rather than consuming separately. A permit consumed by the standalone command cannot then be reused by `serve`.

## State model

The state directory contains:

```text
current -> generations/<sequence>-<permit_sha256>
generations/<sequence>-<permit_sha256>/
  activation-permit-root-set.json
  permit-envelope.json
  trust-policy-envelope.json
  trust-root-set.json
  runtime-profile.json
  consumption.json
consumed.ndjson
```

The `current` pointer must be a relative symlink directly under `generations/`. Generation directories and consumption files must be real filesystem objects, not symlinks. The activation-permit state path itself is part of the signed runtime-profile hash, so pointing the service at a fresh directory does not make an old permit valid again.

## Failure behavior

The wall rejects, among other cases:

- insufficient threshold signatures;
- unknown or duplicate signers;
- malformed or non-Ed25519 roots;
- wrong network, node, policy, policy envelope, trust root set, or runtime profile;
- future, not-yet-valid, expired, or overlong permits;
- non-loopback backend or status targets;
- state-directory substitution;
- replay, rollback, sequence gaps, and wrong predecessors;
- concurrent consumption;
- corrupt generations or escaping symlinks;
- missing enable gates.

Any rejection is a `HOLD:`. There is no permissive fallback.

## Delivery boundary

The branch builder for this wall only writes the ten reviewed repository paths, proves the authenticated edge and signed trust-policy foundations again, proves this wall and its guard, runs the production build and index guard, commits, pushes, and opens a pull request. It does not deploy the service, does not enable any gate, does not replace the current P2P listener, does not restart a process, and does not move money.
