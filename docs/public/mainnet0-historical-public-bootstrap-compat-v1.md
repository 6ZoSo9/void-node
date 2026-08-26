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
  `proposer.commit-direct.v2fs`;
- exact heights `196019` and `196020`: modern signed envelopes;
- exact heights `196021` and `196022`: `proposer.commit-direct.v2fs`.

The exact minimal-to-v2fs transition height remains derived from the persisted
parent block's era. A separate, canonical short modern island was observed at
`196019..196020`; returning to legacy-v2fs is admitted only by the exact
`196020 -> 196021` bridge, not by a general modern-to-legacy rule.

## Trust boundary

Historical blocks do not contain modern proposer/signature authority. This lane
does not claim otherwise.

The clean public-bootstrap historical lane therefore does **not** trust a
loopback address by itself. The supervisor creates a fresh 256-bit secret and
adapter-generation identifier in memory, creates the public-seed adapter in the
same process, and spawns the VOID node child with a dedicated IPC channel. The
secret and generation are delivered to the child only through that IPC channel;
they are not placed in environment variables, files, argv, manifests, status
JSON, or logs.

For each `/blocks/range` request that could supply historical append authority,
the child generates a fresh random nonce. The adapter HMAC-SHA256 attests an
unambiguous JSON transcript containing the generation, sequence, nonce, method,
exact route/query, HTTP status, exact response byte length, and SHA-256 of the
exact bounded response bytes. The child verifies that HMAC with
`crypto.timingSafeEqual()` after bounded byte admission and immediately before
JSON parse. Historical authority is threaded only from that exact verified range
response; a verified head/status response cannot authorize another range.

If the IPC channel disconnects or the authority generation changes, the
in-memory authority is cleared/fails closed. A foreign local process that later
rebinds the exact same `127.0.0.1:PORT` sees the nonce but does not know the
IPC-delivered secret, so it cannot mint historical append authority.

This protects against same-origin adapter-process replacement while local process
isolation remains intact. It does not claim to defend against an attacker that
can read the legitimate child's memory or replace the entire trusted supervisor
and child process tree.

Legacy-v2fs retains its existing explicit
`VOID_FOLLOWER_LEGACY_V2FS_ORIGINS` compatibility path for non-public-bootstrap
operators. That manual path is separate from, and is not protected by, the IPC
HMAC construction. A clean public bootstrap requires no manual origin
configuration.

## Era ratchet

For the public historical append methods:

- empty chain -> minimal: allowed;
- minimal -> minimal: allowed;
- minimal -> legacy-v2fs: allowed;
- legacy-v2fs -> legacy-v2fs: allowed;
- legacy-v2fs -> minimal: rejected;
- exact canonical `196020` modern parent -> exact canonical `196021`
  legacy-v2fs candidate: allowed;
- every other modern -> historical transition: rejected.

The `196020 -> 196021` exception is envelope- and boundary-bound and still
requires the same verified public-bootstrap historical response authority.
Modern `validateBlockForAppend()` is not weakened or modified.

Modern follower imports use a dedicated SegStore append method that invokes the
unchanged modern validator and canonical durability path directly. They do not
traverse the legacy local `saveBlock` sealing/metrics wrapper stack, so imported
authoritative bytes cannot be rewritten by local block-production helpers.

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
