# VOID P2P verified-peer cache and reconnect v1

Status: source-only persistence foundation for issue #1045 and launch blocker #1005.

## Purpose

PR #1041 makes peer addresses canonical and IPv6-safe. PR #1044 then proves a
remote raw-TCP peer owns the Ed25519 identity it claims and cryptographically
binds its canonical listen-address set into AUTH.

This lane makes that authenticated state durable so bootstrap becomes an
introduction mechanism rather than a permanent dependency. After one successful
authenticated contact, a node can restart or lose the original bootstrap path
and reconnect directly to previously verified peers.

## Durable trust rule

Only a peer that completes #1044 AUTH may create or refresh a cache record.
The record contains exactly:

```text
node_id
addresses[]
last_authenticated_at_ms
```

`addresses[]` comes from that peer's own authenticated transcript. A third-party
PEERS advertisement may trigger an in-memory connection attempt, but the
advertised string itself is never persisted. If that dial later completes AUTH,
only the new peer's own signed listen set becomes durable state.

## Cache format and failure boundary

The cache is stored below the node data directory at:

```text
p2p/verified-peers-v1.json
```

The document is versioned and bounded:

- at most 128 peers;
- at most 8 canonical addresses per peer;
- at most 256 KiB;
- 30-day record lifetime;
- five-minute future-clock tolerance;
- unique node IDs;
- one unambiguous owning identity per cached address;
- exact closed object schemas.

Malformed, oversized, duplicate, ambiguous, future-dated, corrupt, symlinked,
or otherwise invalid cache state fails closed and yields no reconnect targets.
Stale records are ignored. An invalid existing cache is not automatically
replaced by a later authentication event.

Writes use a private temporary file, fsync, atomic rename, mode 0600, and a
best-effort directory fsync. Cache directories reject existing symlink path
components.

## Identity-pinned reconnect

Every cached dial carries the expected node ID from the durable record. TCP
connection success alone does not satisfy the pin. The remote must complete
#1044 AUTH and present that exact node ID. A different valid identity at the
same IP/port is rejected and cannot rewrite the cache.

After a successfully authenticated connection closes unexpectedly, the node
schedules bounded reconnect using only that peer's authenticated address set.
Operator stop suppresses reconnect.

Cached targets retain independent address-level backoff. One dead cached peer
therefore cannot block a healthy cached sibling.

## Startup behavior

At startup the node loads the verified cache independently of `BOOTSTRAP_ADDRS`.
Valid cached targets and configured bootstrap targets are both eligible
introduction paths. A node with empty `BOOTSTRAP_ADDRS` can reconnect from its
verified cache alone.

## Proof marker

```text
VOID_P2P_VERIFIED_PEER_CACHE_RECONNECT_V1_PROOF_GREEN
authenticated_peer_only_persistence=true
third_party_peers_persisted=false
restart_without_bootstrap_reconnected=true
cached_identity_mismatch_accepted=false
corrupt_cache_dialed=false
stale_cache_dialed=false
single_required_seed=false
wallet_signer_validator_wc_money_authority=0
```

The focused proof also covers symlink rejection and independent cached-peer
failure. The #1041 multipath and #1044 authenticated-peer proofs remain required
regressions.

## Non-goals and authority boundary

This lane does not add reachability classification, AutoNAT, relay reservations,
DCUtR/hole punching, bootstrap-record v2, Tor changes, router/firewall changes,
or live deployment.

It does not read credentials or wallet/signer material, mutate validator or Work
Credit state, submit transactions, or move funds.
