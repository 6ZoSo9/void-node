# Buy VOID allocation-custody runtime bundle candidate v2

Marker: `VOID_BUY_VOID_CUSTODY_RUNTIME_BUNDLE_CANDIDATE_V2`.

Status: **source/CI-only, unaccepted bundle candidate**.

## Purpose

V2 is a versioned successor to immutable V1. It recognizes exactly one reviewed
build/runtime source transition from the FIFO-safe cross-UID capacity claim
reader in #3671 and changes no runtime authority.

The source base is `7197eb96ff3ce2d3f630545a85c150b694d20b3b` / tree
`ed7c516dc7d49895a2af576add999c3a5dde945b`.

## Exact predecessor

V1 remains byte-identical and is never repinned in place:

- tool blob: `de5e3066042d1b20d54acea4b464d591b2d88e1c`
- proof blob: `f26ccafea229a25c9774f18effa2fd0727561972`
- document blob: `34cbfc741c53f9f0b150f1343a4b40aace736907`
- workflow blob: `961c48c227696b5d9f4000e89797e4fcebe101b6`

V2 requires the V1 and V2 source maps to differ at exactly one path:

`src/economic/buy_void_cross_uid_capacity_exclusive_lock_v1.mjs`

with exact transition:

`a7610b03d394254c760683f0d9061aa0865718db`
→
`94f0a0dd8997e1e2c0fab54044f19d70d983d441`.

The other 18 pinned build/runtime inputs are unchanged.

## Runtime/build closure

The runtime layout remains the same ten-file package-free closure as V1: four
tracked source modules and six compiled TypeScript modules. The build-source
closure, TypeScript 5.9.3 identity, package/lock/tsconfig pins, Node builtin-only
external imports and Node 22/24/26 byte-equality requirement are preserved.

## Candidate identity

V2 is content-addressed independently as:

`voidbuycustodybundle2_<sha256(canonical-candidate-body + newline)>`.

The candidate records its exact V1 predecessor identities and the one-row source
transition. This is source-generation evidence only.

## Deliberate HOLDs

All of these remain false:

```text
candidate_accepted=false
claim_reader_independent_review_complete=false
immutable_root_install=false
node_binary_identity_verified=false
request_root_selected=false
shared_directory_selected=false
service_unit_installed=false
service_started=false
service_restarted=false
systemd_mutation=false
runtime_integration=false
reserve_method_enabled=false
recover_method_enabled=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```

Archive generation, archive acceptance lock, installed runtime identity, claim
release/recovery and operator/payment activation remain later separate gates.

## Hosted verification

The focused workflow checks exact #3671 ancestry and the exact four ADD-only V2
paths, compiles with the locked TypeScript compiler on Node 22/24/26, runs the
V2 proof, emits one candidate per Node major, uploads each candidate and requires
byte-identical cross-node candidates.

## Authority boundary

No host install, service/systemd mutation, private storage read, credential/key
access, signing, RPC/transaction, reserve/recover, payment acceptance, public
presale/WC activation, treasury/liquidity action or funds movement.


## October 22 independent-review repair — candidate identity and reader controls

The V2 verifier now requires the exact candidate ID and canonical wire SHA-256
from hosted three-Node comparison run `39680421006`:
`voidbuycustodybundle2_85d68cef4b2ed3e682efb665c41d8d918bd00908bb5f3aa486dedc3f7e74d0a6`,
`5edc11a1960389a25c48534b8fff90397fd58a1ec61d174fba455de23987d4f9`.
The value is **not** accepted from a candidate's self-declared identity alone.
This pins all runtime file sizes, SHA-256/imports, compiler fingerprints,
build recipe and source records; exact top-level HOLD flags are still checked.

Both source/build and candidate-artifact reads now walk ancestor directories
through retained O_DIRECTORY/O_NOFOLLOW/O_NONBLOCK descriptors, open the leaf
with O_NOFOLLOW/O_NONBLOCK, require single-link regular-file exact metadata,
perform bounded reads with an EOF-growth probe, and recheck descriptor and
visible-path generations before using bytes. Adversarial disposable-file
tests swap in FIFO, symlink and oversized leaf bytes at the **actual** open
boundary, requiring fail-closed rejection without blocking.

This is exact source/CI candidate security, **not** independent runtime
acceptance, an authorized service installation, a custody reserve/recover
activation, or payment/presale authority. Existing V1 archive and lock are
immutable and still pin the older reader; do not install them as V2.
