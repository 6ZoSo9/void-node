# VOID public bootstrap record v2 locator/resolver v1

## Purpose

Merged PR #1047 established the source-only `void_public_bootstrap_record_v2`
mirror contract. That contract binds an exact v1 bootstrap manifest to immutable
HTTPS/Tor mirror roots and can resolve the manifest once a trusted bootstrap
record is already in hand.

The remaining distribution gap is earlier in the chain:

> How does a fresh client obtain one exact `voidpbr2_...` record from
> replaceable mirrors without allowing whichever mirror answered first to
> redefine bootstrap truth?

This lane adds that missing **locator/resolver contract** without modifying the
merged record schema or any runtime/bootstrap launcher.

## Trust boundary

The resolver requires the caller to supply an exact expected record ID:

```text
voidpbr2_<sha256>
```

The expected ID must come from a separately reviewed release/trust-root
mechanism. Locator mirrors are transport only.

Every returned record must therefore satisfy both:

1. the merged #1047 record's own canonical `record_id` verification; and
2. exact equality with the caller-pinned expected `record_id`.

A malicious mirror cannot substitute a different record merely by returning
different bytes with a newly recomputed, internally self-consistent ID.

## Locator mirrors

Locator mirrors reuse the merged #1047 mirror-root contract:

- 3 through 16 mirrors;
- distinct roots, hostnames, and declared failure domains;
- both HTTPS and Tor transport represented;
- exact `/void/bootstrap/v2` root;
- immutable record URL derived as
  `/records/<voidpbr2_record_id>.json`;
- no mutable `/latest` alias.

The locator mirror list is intentionally external to the bootstrap record.
Replacing locator infrastructure does not change the bootstrap record ID.

After the exact record is resolved, its **internal** mirror set remains the
source for resolving the manifest bytes under the already-merged #1047
contract. The two layers have different jobs:

```text
release/trust root
  -> exact voidpbr2 record ID
  -> replaceable locator mirrors
  -> exact verified bootstrap record
  -> record-bound manifest mirrors
  -> exact verified v1 manifest
```

## N-1 behavior

The focused proof uses four locator mirrors split across two HTTPS and two Tor
locations. Removing any one leaves three mirrors, at least one of each
transport, and distinct failure domains.

The proof also demonstrates ordered failover across:

- an unavailable locator;
- a locator returning a different but valid self-hashed record;
- an oversized locator response; and
- a healthy final locator returning the exact pinned record.

All locator failure fails closed.

## Non-goals

This contract performs no real network I/O. The fetch function is injected so a
later integration can supply bounded HTTPS/Tor transports without coupling
content verification to one transport implementation.

This lane does **not**:

- modify `run-void-node.sh`;
- modify the current v1 bootstrap resolver;
- modify `src/node_core.ts`;
- modify relay/hole-punching behavior;
- publish a v2 record or v1 manifest;
- activate Tor, DNS, VPS, router, firewall, or services;
- access credentials, node/wallet/signer keys, validators, Work Credits, or
  money-moving authority.

## Follow-on

After this source contract is reviewed and merged, a separate runtime
integration lane can bind the ordinary launcher to:

1. a separately trusted expected `voidpbr2_...` ID;
2. multiple locator mirror transports;
3. this exact record resolver; and
4. the already-merged #1047 manifest-mirror resolver.

That runtime step must preserve the current v1 path until migration and N-1
acceptance proofs are exact-green.
