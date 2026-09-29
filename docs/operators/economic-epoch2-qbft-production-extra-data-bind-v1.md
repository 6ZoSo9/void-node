# Epoch-2 QBFT production extraData bind v1

Marker:

`VOID_ECONOMIC_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_BIND_V1`

Status: **source/runtime bundle gate; canonical 4th identity still required**.

## Purpose

Once the QBFT binding contains exactly four independently attested production
identities, this lane turns the four ordered Besu validator addresses into the
exact QBFT genesis `extraData` produced by pinned Besu 26.8.1 and binds those
bytes back to the validator-binding candidate.

This removes another manual-edit step without claiming that the production
validator set is live.

## Input

The binding must first pass
`VOID_ECONOMIC_EPOCH2_QBFT_PRODUCTION_EXTRA_DATA_PREFLIGHT_V1` with:

```text
attested_live_node_count=4
required_live_node_count=4
attested_identity_slots_remaining=0
status=READY_FOR_BESU_QBFT_EXTRA_DATA_ENCODING
```

The exact ordered validator-address array is then supplied to pinned Besu:

```text
hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042

rlp encode --from=/work/validators.json --type=QBFT_EXTRA_DATA
```

## Exact RLP verification

The binder does not trust an opaque hex blob. It decodes the Besu output and
requires the QBFT genesis structure to be exactly:

1. 32 zero vanity bytes;
2. the exact four validator addresses in canonical binding order;
3. an empty vote list;
4. round zero; and
5. an empty commit-seal list.

It independently re-encodes the same structure with canonical RLP and requires
byte-for-byte equality with the Besu output.

The evidence is tied to Besu release commit
`d97cbd61976a52bb109e637196fef9a8ebf2b617` and these upstream source blobs:

- `QbftExtraDataCLIAdapter.java`:
  `a2cda10a4a1bbbe4541477424778b00ea84a5531`;
- `QbftExtraDataCodec.java`:
  `39c7aa3006738fa86b689a6e06e698fbf54da49b`;
- `BftExtraDataCodec.java`:
  `c6bf51ee640c99f0b3bb06a03fc4fe05be867765`.

## Output bundle

The runner writes:

```text
economic-epoch2-qbft-validator-binding-candidate-v1.json
economic-epoch2-qbft-production-extra-data-v1.json
```

The updated binding records the SHA-256 of the exact encoded bytes and points to
the production extra-data evidence artifact.

This lane may promote in the **output bundle**:

```text
qbft_live_identity_manifest_ready=true
qbft_minimum_live_nodes_attested=true
qbft_public_key_address_derivations_verified=true
qbft_production_extra_data_built=true
```

## Deliberate HOLD

Generating and content-addressing genesis `extraData` is still not validator
activation or production runtime binding.

The output must retain:

```text
production_validator_set_bound=false
offline_successor_equivalence_proven=false
all_production_validators_epoch_domain_enforced=false
authoritative_chain2050_write=false
migration_authorized=false
public_activation_authorized=false
funds_movement=false
```

A later gate must bind the exact four-validator `extraData` into the reviewed
production successor genesis, boot the production-shaped offline successor, and
verify all four validator runtime identities before those downstream gates can
advance.

## Local use after Alienware import

After the real Alienware public attestation has been imported and the four-entry
binding bundle exists:

```bash
bash scripts/run_void_economic_epoch2_qbft_production_extra_data_bind_v1.sh \
  /path/to/economic-epoch2-qbft-validator-binding-candidate-v1.json \
  /path/to/output-directory
```

The runner pulls only the exact pinned Besu image and uses the `rlp`
subcommand. It does not start a Besu node.

## Authority

This lane performs offline encoding and local output-file creation only. It does
not read private validator keys, start/restart services, mutate validators,
contact production RPC, construct/sign/submit/broadcast a transaction, write
Chain-2050, move tokens/funds, authorize migration, or activate the network.

Verification:

```bash
node scripts/prove_void_economic_epoch2_qbft_production_extra_data_bind_v1.mjs
```
