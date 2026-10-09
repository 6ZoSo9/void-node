# Buy VOID source-finality generation provenance V6 — integrated candidate

## Why V6 remains a separate generation

Historical V5 is immutable predecessor evidence. The current integration changes
two of V5's five reviewed runtime sources:

- the V2 payment verifier, which binds coupled native-USDC checkout intent; and
- the payment RPC observer, which now enforces bounded transport parsing plus a
  monotonic total wall-clock acceptance deadline.

Historical V5 therefore must continue to fail closed against these bytes. No V5
source record or historical compiled/enforcement/package artifact is repinned.

The current integrated source anchor is
`3533626d7167c98ba8d65d2c423b460b1a3199fc`. It retains #2687 as a merge
parent so the reviewed observer source commit remains real repository ancestry.

## Closed source identities

V6 retains the identical three historical records for:

- authenticated composition V3 — blob
  `a3dbe4d0fed3034d3ca2c0b3704a758d7c776090`;
- source-finality authority V2 — blob
  `64953050d74bc0bc6d1e6948ae992d6143edca99`;
- source-chain RPC adapter V1 — blob
  `419054e00f4d96015cd066be81e8719ee71ac00c`.

Two reviewed records roll:

- payment RPC observer V1 — reviewed source commit
  `9df9648f546eb9320259eae1d3930a7c132a6511`, blob
  `0073818ad6f6418e895bf794024c9d678b3bef86`;
- verified-payment V2 — reviewed source commit
  `1397e6e17f53084158bdc2137dae0b38f6d6929a`, blob
  `550ede02fc0b7d6874c324af58b5ef9c5591b311`.
  Historical predecessor: `c77bb6144b27eb8fdaff168200cea24d9c0ee9ac` at `52deccca51077d457177e738135dbb0e0536d2f3`.

The canonical reviewed-source-set digest for those five records is
`ecdcb0f86b2fb18fd035828c1cf7cbc5025b1014703a2307c10fc6722c7424f1`.

Records are fixed source metadata; caller or environment input cannot substitute
commit or blob identities.

## Runtime-file verification

The V6 verifier checks module-derived paths, regular nonsymlink single-link
files, retained-descriptor identity, bounded reads and Git blob SHA-1 for all
five sources before entering the authenticated composition. Linux
`O_NOFOLLOW` is required. The visible pathname is compared with the retained
descriptor before and after reading.

Each file is capped at 2 MiB before reading. The descriptor reader allocates
only the preflight size plus one sentinel byte, so concurrent growth is detected
without unbounded buffering. Same-size mutation, path replacement, descriptor
drift and post-read rebinding HOLD.

The focused proof also verifies each recorded commit-to-blob mapping against Git
history in a non-shallow checkout.

## Payment-observer rollover

The reviewed payment observer keeps a closed read-only RPC method set, HTTPS or
loopback HTTP transport, bounded idle timeout, bounded response bytes, 2xx HTTP,
exact JSON media type, JSON-RPC version/request-ID binding and receipt/chain
checks.

Its total deadline is not timer-delivery-only. The transport records a
monotonic acceptance deadline before network transmission. The single success
settlement fence rechecks monotonic time after response aggregation, JSON parse
and envelope validation. A valid response buffered while the client event loop
is blocked past the deadline therefore still HOLDs with
`payment_observer_rpc_total_deadline_exceeded`.

The synthetic proof includes a responder in a separate child process so server
time continues while the client event loop is deliberately blocked across the
deadline.

## Source proof is not production authority

V6 still leaves current production authority false. In particular,
`source_generation_verified=false`,
`deployed_artifact_generation_verified=false`,
`remote_provider_identity_verified=false`,
`ancestry_verified=false`,
`provider_quorum_verified=false`, and
`production_source_finality_authority_ready=false` remain authoritative.

Authentication of the first durable buyer request, real payment/finality,
protected antirollback high-water, serialized duplicate/capacity admission,
exactly-once allocation custody, deployed image identity and mounted runtime
remain separate gates.

The required successor lineage is:

```text
V6 closed-source review
  -> cross-Node compiled V4 candidate
  -> locked compiled V4 successor
  -> enforcement successor
  -> packaged/final-image successor
  -> separately accepted deployed runtime generation
  -> protected request/payment/allocation custody evidence
```

This source lane does not itself deploy/restart a service, read a live customer
ledger, access credentials/wallet/private keys/signers, construct or broadcast
a transaction, mutate Chain-2050/WC, activate presale/market state, or move
inventory/treasury/liquidity/funds.

**PROTECT THE CORE.**
