> **Superseded topology note — 2026-09-29:** This entry is a historical snapshot.
> The current canonical production QBFT topology is three validators
> (Precision, Nimo, Xiphos), quorum 2, Byzantine fault tolerance 0.
> A fourth validator is not a current launch prerequisite. Current truth is
> `ops/mainnet0/economic-epoch2-qbft-topology-v1.json`.

# Epoch-2 QBFT production extraData preflight v1

Marker: `VOID_REN_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_PREFLIGHT_V1`

On 2026-09-28, Xiphos became the third canonical production-candidate Besu QBFT
identity. At that time, the working plan still treated a fourth independent
validator host as a production prerequisite.

**Superseded 2026-09-29:** the canonical production topology is now Precision,
Nimo, and Xiphos: three validators, quorum two, Byzantine fault tolerance zero.
A fourth validator is a future safety expansion and is not a launch prerequisite.

To keep launch work moving while the fourth host is unresolved, a source-only
preflight was prepared for the next gate. It fails closed on the real current
3/4 binding, validates exact public-key/address derivation and uniqueness, and
proves the four-address input shape against pinned Besu 26.8.1 with a synthetic
test-only fourth identity.

Historical truth at the close of this 2026-09-28 entry was:

- canonical QBFT identities: 3;
- then-required identities: 4;
- then-remaining identity slots: 1;
- production QBFT extraData built: false;
- production validator set bound: false;
- authoritative Chain-2050 write: false;
- migration authorized: false;
- public activation authorized: false.

Memory for context. Repo for truth. Brood journal for continuity.
