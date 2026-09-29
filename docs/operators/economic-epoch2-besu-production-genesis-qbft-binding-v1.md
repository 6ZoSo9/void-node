# Epoch-2 Besu production genesis QBFT binding v1

Marker: `VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_V1`

Status: **production-shaped genesis source/runtime proof; live validator runtime HOLD**.

## Purpose

The existing Epoch-2 Besu genesis builder historically uses four proof-only QBFT
placeholder addresses. That path remains available for historical/offline
evidence.

This lane adds a second, explicit production-shaped mode. It accepts only the
verified four-validator QBFT `extraData` evidence produced by
`VOID_ECONOMIC_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_EVIDENCE_V1` and places those
exact bytes into `genesis.extraData`.

## Evidence validation

Before accepting production QBFT `extraData`, the builder independently
requires:

- Chain ID 2050;
- pinned Besu 26.8.1 image and release commit;
- exact upstream QBFT codec source blob identities;
- exactly four unique, non-placeholder validator addresses;
- one public-key/identity-attestation record per validator;
- exact SHA-256 of the encoded `extraData` bytes;
- RLP decode to 32 zero vanity bytes, the exact validator order, empty vote,
  round zero, and empty commit seals;
- byte-for-byte independent canonical RLP re-encoding; and
- all migration/activation/runtime-enforcement authority bits still false.

## Dual-mode behavior

Without production evidence, the builder preserves the old proof-only
placeholder path unchanged.

With production evidence, the output genesis records:

```text
consensus.mode=production_four_validator_extra_data
production_qbft_extra_data_bound_into_genesis=true
client_specific_genesis_candidate_built=true
```

The builder evidence also records the exact four validator addresses and
`production_extra_data_sha256`.

## Runtime proof

Hosted CI generates a synthetic fourth identity, runs the exact same four-node
preflight and QBFT extra-data binder, then builds a production-shaped genesis.

Pinned Besu 26.8.1 boots that genesis as a non-validator observer with P2P
disabled. CI verifies:

- `eth_chainId=0x802`;
- genesis block `extraData` equals the exact bound production bytes; and
- `qbft_getValidatorsByBlockNumber("0x0")` returns the same four-validator
  set. Besu may sort that RPC result; canonical validator order is proved
  separately by exact block-0 `extraData` equality.

No validator private key is needed for this proof.

## Deliberate HOLD

Binding the four-validator bytes into the production-shaped genesis is not
equivalent to proving all four real production runtimes.

These remain false:

```text
production_validator_set_bound=false
besu_genesis_parse_verified=false   # in the source artifact itself
client_specific_state_equivalence_proven=false
offline_successor_equivalence_proven=false
migration_authorized=false
public_activation_authorized=false
```

The hosted CI runtime may prove that the generated genesis parses and exposes
the intended roster, but canonical promotion still requires the real Alienware
identity bundle, a reviewed canonical production genesis artifact, and
production-validator runtime evidence.

## Authority

This lane performs source transformation and disposable hosted-CI Besu startup
only. It does not read production validator private keys, mutate a production
validator set, contact production RPC, construct/sign/submit/broadcast a
transaction, write authoritative Chain-2050 state, move tokens/funds, authorize
migration, or activate the network.

Verification:

```bash
node scripts/prove_void_economic_epoch2_besu_genesis_builder_v1.mjs
node scripts/prove_void_economic_epoch2_besu_production_genesis_qbft_binding_v1.mjs
```
