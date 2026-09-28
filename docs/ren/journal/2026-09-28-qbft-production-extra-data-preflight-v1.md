# Epoch-2 QBFT production extraData preflight v1

Marker: `VOID_REN_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_PREFLIGHT_V1`

On 2026-09-28, Xiphos became the third canonical production-candidate Besu QBFT
identity. Alienware is unavailable and is not part of the active critical path.

The consensus requirement remains four independently attested live Besu
identities. The requirement is not reduced to fit current hardware.

To keep launch work moving while the fourth host is unresolved, a source-only
preflight was prepared for the next gate. It fails closed on the real current
3/4 binding, validates exact public-key/address derivation and uniqueness, and
proves the four-address input shape against pinned Besu 26.8.1 with a synthetic
test-only fourth identity.

Current truth after this preparation remains:

- canonical QBFT identities: 3;
- required identities: 4;
- identity slots remaining: 1;
- production QBFT extraData built: false;
- production validator set bound: false;
- authoritative Chain-2050 write: false;
- migration authorized: false;
- public activation authorized: false.

Memory for context. Repo for truth. Brood journal for continuity.
