# Mainnet-0 historical public-bootstrap compatibility v1

Status: source/proof candidate

## Purpose

Allow a clean Chain-2050 node to synchronize the canonical Mainnet-0 historical
prefix through the already-qualified public HTTPS bootstrap adapter without
Tailscale, manual `BOOTSTRAP_ADDRS`, or private per-node origin configuration.

## Observed historical eras

Outside-machine Nimo evidence established:

- height `0` through sampled height `100000`: exact minimal envelope
  `{"number","timestamp"}`;
- sampled height `250000` through `1951058`:
  `proposer.commit-direct.v2fs`.

The exact minimal-to-v2fs transition height is intentionally not a consensus
constant. Correctness is derived from the persisted parent block's era.

## Trust boundary

Historical blocks do not contain modern proposer/signature authority. This lane
does not claim otherwise.

Minimal historical admission is available only when the current `pullOnce()`
origin exactly equals the single numeric-loopback HTTP adapter origin already
bound by:

- `VOID_PUBLIC_BOOTSTRAP_CLIENT_ADAPTER_ACTIVE=1`;
- `VOID_FOLLOWER_AUTOSTART_PEERS`;
- `VOID_FOLLOWER_AUTOSTART_PEER`.

The two autostart variables must resolve to the same single loopback origin.
A different loopback port, a manual `/follower/once` peer, multiple adapter
origins, or a non-loopback origin does not inherit this historical trust.

Legacy-v2fs follower admission retains its explicit legacy origin compatibility
mechanism, but the verified public-bootstrap adapter is sufficient on the
zero-configuration public path.

## Era ratchet

For the public historical append methods:

- empty chain -> minimal: allowed;
- minimal -> minimal: allowed;
- minimal -> legacy-v2fs: allowed;
- legacy-v2fs -> legacy-v2fs: allowed;
- legacy-v2fs -> minimal: rejected;
- modern -> either historical era: rejected.

Modern `validateBlockForAppend()` is not weakened or modified.

## Persistence

Minimal historical blocks use a distinct SegStore append mode with exact JSON
identity rather than `blockHash()`. Historical-ratcheted WAL records use explicit
versions for minimal and v2fs so crash replay preserves the same era boundary.

## Non-goals

This repair does not:

- authenticate historical blocks cryptographically when the historical data never
  contained such signatures;
- publish a new seed or P2P endpoint;
- change DNS, services, runtime, chain state, wallets, validators, Work Credits,
  treasury authority, or funds;
- solve the separate authenticated native-P2P introduction requirement in #1414.
