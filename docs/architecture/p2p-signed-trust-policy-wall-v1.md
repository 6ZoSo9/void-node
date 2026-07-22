# VOID P2P Signed Trust Policy Wall v1

Status: **implemented as a disabled-by-default policy wall; not deployed, enabled, or used to alter the running peer set by this change**.

## Lane claim

The authenticated P2P edge wall establishes *who a peer proves itself to be*. This wall governs *which proven identities may enter the mesh and which endpoints may be dialed*.

It replaces mutable, hand-edited allow/deny/peer environment values with a threshold-signed, network-bound, expiring policy document. It is a separate module and supervisor around the authenticated edge wall. It does not modify `src/index.ts`, the existing VOID P2P byte protocol, consensus, block execution, account state, validator operations, public earning, Buy VOID, wallets, signers, or settlement.

The build is intentionally stacked after PR #667. The builder refuses to proceed unless the exact authenticated edge-wall v1 files are already present on `origin/main`.

## Threat model

The wall is designed to stop these operator-plane failures from becoming live mesh admission changes:

- a service environment file is edited to add an unapproved node ID;
- a peer endpoint is replaced while retaining a plausible hostname;
- an old but valid policy is replayed after a revocation;
- one compromised policy signer attempts to change mesh membership;
- a signed policy for another VOID network is copied onto this node;
- a policy is accepted before its validity window or after expiration;
- two activations race and leave a partially written policy state;
- a policy silently enables permissionless admission;
- the runtime node is given an offline policy private key.

Root-level compromise of the host is outside the software boundary. A root user can replace binaries, pinned root sets, or policy state. The wall makes ordinary process, file, signing, replay, and activation failures explicit and fail-closed; it does not claim to defeat a hostile operating-system administrator.

## Trust split

### Offline policy authority

One or more Ed25519 policy keys remain offline. A pinned root-set document contains only public keys and a threshold. The included provisioner creates a non-overwriting single-key root set for bootstrap or testing. Production operators can construct a sorted multi-key root set and set a threshold greater than one.

The private signing key must never be copied to the runtime node. The `sign` command is guarded by `VOID_P2P_TRUST_POLICY_OFFLINE_SIGNING=1`, performs no network access, and writes its output with create-exclusive semantics.

### Runtime verifier

The runtime node receives:

- a pinned root-set JSON document;
- a signed policy envelope JSON document;
- a configured expected VOID network ID;
- a writable local activation-state directory.

The verifier derives the authenticated edge wall’s network ID, exact allow list, exact deny list, and pinned dial targets. It always forces `VOID_P2P_EDGE_WALL_PERMISSIONLESS=0` regardless of the surrounding process environment.

## Root-set contract

The root set is canonical JSON with this shape:

```json
{
  "schema": "void-p2p-trust-root-set-v1",
  "network_id": "void-mainnet0-chain2050",
  "threshold": 2,
  "keys": [
    {
      "key_id": "64-lowercase-hex-spki-sha256",
      "public_key_pem": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----\n"
    }
  ]
}
```

Keys must be Ed25519, sorted strictly by `key_id`, and duplicate-free. `key_id` is SHA-256 of the DER-encoded SubjectPublicKeyInfo. The threshold is pinned locally and cannot be lowered by a signed policy.

## Signed policy contract

The policy object is canonical JSON with exactly these fields:

```json
{
  "schema": "void-p2p-signed-trust-policy-v1",
  "network_id": "void-mainnet0-chain2050",
  "epoch": "1",
  "issued_at": "2026-07-22T11:00:00.000Z",
  "not_before": "2026-07-22T11:30:00.000Z",
  "expires_at": "2026-07-29T11:30:00.000Z",
  "allow_node_ids": ["64-lowercase-hex-node-id"],
  "deny_node_ids": [],
  "peers": [
    {
      "host": "peer.example.net",
      "port": 4790,
      "expected_node_id": "64-lowercase-hex-node-id"
    }
  ]
}
```

Epochs after `1` must additionally include:

```json
{
  "previous_policy_sha256": "sha256-of-the-active-canonical-policy"
}
```

The envelope has this shape:

```json
{
  "schema": "void-p2p-signed-trust-policy-envelope-v1",
  "policy": { "...": "..." },
  "signatures": [
    {
      "key_id": "64-lowercase-hex-root-key-id",
      "signature_base64": "canonical-64-byte-ed25519-signature"
    }
  ]
}
```

The signature preimage is the UTF-8 domain separator `VOID_P2P_SIGNED_TRUST_POLICY_V1\n` followed by canonical JSON for the policy object. Object keys are sorted. Node-ID arrays, root keys, signatures, and peer entries must already be in strict canonical order and contain no duplicates.

## Verification wall

A policy is held unless every condition below is true:

1. Root set, envelope, policy, signatures, and peer entries contain only the exact v1 fields.
2. Root public keys are Ed25519 and each public key hashes to its declared `key_id`.
3. Root set, policy, and operator configuration name the same VOID network ID.
4. The policy epoch is a positive canonical decimal string.
5. Timestamps are canonical UTC instants and satisfy `issued_at <= not_before < expires_at`.
6. The policy is currently valid within the configured clock-skew allowance.
7. The validity lifetime, document size, node counts, and peer count stay within configured limits.
8. The allow list is nonempty. Permissionless admission is never derived.
9. Allow and deny lists do not overlap. Deny remains authoritative.
10. Every dial target pins an exact node ID that is allowed and not denied.
11. Peer hosts are dialable IP literals or DNS names, never wildcard/listener addresses or URLs.
12. Every signature belongs to a pinned root key and verifies over the canonical domain-separated policy.
13. The number of distinct valid signatures meets the locally pinned threshold.

Unknown signers are rejected rather than ignored. This prevents a mixed envelope from hiding an unexpected authority addition.

## Anti-rollback and atomic activation

The activation state is a mode-0700 directory with these surfaces:

```text
state/
  activation.lock
  activation.ndjson
  generations/
    <zero-padded-epoch>-<policy-sha256>/
      policy-envelope.json
      edge-wall-environment.json
      activation.json
  current -> generations/<active-generation>
```

Activation uses a create-exclusive lock. A complete generation is written into a private staging directory, each file is fsynced, the staging directory is renamed into `generations`, and a temporary relative symlink is atomically renamed over `current`. An append-only activation record is then fsynced.

Rules:

- The first active policy must use epoch `1` and must not claim a predecessor.
- A lower epoch is rejected as rollback.
- Reusing the active epoch with different policy content is rejected.
- Re-activating the exact active policy is idempotent.
- A higher epoch must name the active policy SHA-256 exactly.
- The `current` pointer must be a relative symlink into the local `generations` directory.
- Concurrent activation is rejected while the create-exclusive lock exists.

The predecessor hash makes policy history a signed chain. The epoch provides a simple monotonic operator checkpoint. Neither relies on the order of files copied into the configuration directory.

## Runtime composition

The supervisor requires two independent gates:

```text
VOID_P2P_TRUST_POLICY_WALL_ENABLED=1
VOID_P2P_EDGE_WALL_ENABLED=1
```

On startup it verifies and activates the signed policy, then starts the existing authenticated edge-wall runner as a child process. Policy-controlled values overwrite the process environment:

- `VOID_P2P_EDGE_WALL_NETWORK_ID`
- `VOID_P2P_EDGE_WALL_ALLOW_NODE_IDS`
- `VOID_P2P_EDGE_WALL_DENY_NODE_IDS`
- `VOID_P2P_EDGE_WALL_PEERS_JSON`
- `VOID_P2P_EDGE_WALL_PERMISSIONLESS=0`

Listener addresses, loopback backend, identity certificate paths, status address, audit path, and resource limits remain local operator configuration. The service example conflicts with a separately installed direct edge-wall service so two public listeners cannot accidentally race for the same port.

The supervisor has no remote mutation API. Policy files are supplied out of band by the operator. A change takes effect only through a deliberate process restart or explicit offline `activate` command with `VOID_P2P_TRUST_POLICY_ACTIVATION_ENABLED=1`.

## Authority exclusions

- **No ledger authority.** The wall cannot build, execute, commit, or revert a block.
- **No account-state authority.** It cannot read or mutate production account balances or nonces.
- **No validator authority.** It cannot register, activate, submit, recover, or rotate validators.
- **No wallet or transaction signer authority.** Policy signing keys authorize only canonical P2P admission documents. They cannot sign VOID transactions or node consensus messages.
- **No economic authority.** It cannot credit WC, fulfill Buy VOID, broadcast transactions, settle orders, or move money.
- **No raw P2P protocol mutation.** After policy admission and authenticated edge setup, P2P bytes remain the responsibility of the existing edge wall and backend.
- **No deployment authority.** The builder and merge seal do not install services, copy configuration, restart processes, expose ports, or alter firewall rules.

## Operator sequence

### 1. Provision an offline bootstrap authority

Run this only on an offline operator machine:

```bash
ops/mainnet0/provision-p2p-trust-policy-authority-v1.sh \
  "$HOME/.void/p2p-trust-policy-authority-v1" \
  void-mainnet0-chain2050
```

For a production threshold, create multiple offline authorities, combine their public keys into one strictly sorted root set, and set the root threshold. Do not combine or copy private keys.

### 2. Create and sign epoch 1 offline

Create a bare policy JSON document with canonical ordering. Add signatures one at a time. Each signer reads the prior envelope and writes a new file; outputs are never overwritten.

```bash
VOID_P2P_TRUST_POLICY_OFFLINE_SIGNING=1 \
VOID_P2P_TRUST_POLICY_SIGN_INPUT=policy-epoch-1.json \
VOID_P2P_TRUST_POLICY_SIGNING_KEY_FILE=trust-authority-ed25519.key.pem \
VOID_P2P_TRUST_POLICY_SIGN_OUTPUT=policy-epoch-1.signed-by-a.json \
  npx tsx src/p2p/run_signed_trust_policy_wall_v1.ts sign
```

A second signer uses the first signed envelope as input and a new output path.

### 3. Verify on the runtime node while disabled

Copy only the public root set and completed signed envelope to root-owned configuration paths. Keep both service gates at `0`.

```bash
npx tsx src/p2p/run_signed_trust_policy_wall_v1.ts verify \
  --root-set /etc/void/p2p-trust-policy-wall-v1/trust-root-set-v1.json \
  --envelope /etc/void/p2p-trust-policy-wall-v1/active-policy-envelope-v1.json \
  --network-id void-mainnet0-chain2050 \
  --state-dir /var/lib/void/p2p-trust-policy-wall-v1
```

### 4. Prove the wall

```bash
npx tsx scripts/prove_p2p_signed_trust_policy_wall_v1.ts
npx tsx scripts/prove_p2p_signed_trust_policy_wall_guard_v1.ts
npm run build
chmod +x tools/check_index_size.sh
tools/check_index_size.sh
```

### 5. Stage cutover separately

The code and builder stop before deployment. An operator must separately install the environment and service files, keep the raw P2P backend loopback-only, stop any direct edge-wall service, and deliberately enable both gates. Firewall exposure is a separate audited operation.

## Rollout sections

1. **Offline authority proof:** temporary signing keys and policy files only.
2. **Runtime verify-only:** pinned public roots and signed envelope, both service gates disabled.
3. **Local activation proof:** temporary state directory, no edge child and no public listener.
4. **Shadow supervisor:** disposable loopback backend and listener, no public exposure.
5. **Two-box private mesh:** threshold-signed policy, exact node pins, private addressing.
6. **Public cutover:** only the authenticated edge-wall port is exposed; raw P2P stays loopback-only.
7. **Policy rotation:** higher epoch, exact predecessor hash, threshold signatures, audited restart.

No rollout section is automatically performed by this change.
