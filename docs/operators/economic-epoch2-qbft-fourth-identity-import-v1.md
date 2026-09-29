# Epoch-2 QBFT fourth identity import v1

Marker:

`VOID_ECONOMIC_EPOCH2_QBFT_FOURTH_IDENTITY_IMPORT_V1`

Status: **source importer green candidate; fourth public identity still required**.

## Purpose

The current production QBFT binding has three canonical live identities:

- Precision;
- Nimo; and
- Xiphos.

The production minimum remains four. The remaining intended machine role is
`alienware`.

The existing local identity-prep tool already generates the Alienware public
attestation without exporting the private Besu node key. This importer closes
the next deterministic step so no hand editing of
`economic-epoch2-qbft-validator-binding-candidate-v1.json` is required.

## Input

Generate the public candidate on Alienware with:

```bash
node ops/common/void-economic-epoch2-qbft-local-identity-prepare-v1.mjs \
  --machine-role alienware \
  --node-base http://127.0.0.1:4100/ \
  --output "$HOME/Downloads/void_epoch2_qbft_identity_alienware_public_candidate_v1.json"
```

The generated public file contains only:

- machine role and hostname;
- VOID node ID;
- loopback node base;
- Besu client/image identity;
- Besu public key and derived validator address;
- the SHA-256 of the local private attestation file; and
- false authority/secrecy boundary flags.

The Besu private node key remains under the local private custody root and is
never read by this importer.

## Exact validation

The importer requires:

- exact public-attestation object shape with no extra fields;
- `machine_role=alienware`;
- `node_base=http://127.0.0.1:4100`;
- Besu 26.8.1 and the pinned production image digest;
- one uncompressed secp256k1 public key;
- exact public-key-to-address derivation;
- false private-key export flags;
- false validator/chain/funds authority flags; and
- uniqueness against all three already-bound production identities.

Extra fields are rejected, including any attempted private-key field.

## Output bundle

The importer writes three files to a caller-selected output directory:

```text
economic-epoch2-qbft-node-identity-alienware-v1.json
economic-epoch2-qbft-validator-binding-candidate-v1.json
void-economic-epoch2-qbft-fourth-identity-import-v1.json
```

The updated binding contains four public identity rows and reports:

```text
attested_live_node_count=4
required_live_node_count=4
attested_identity_slots_remaining=0
preflight_status=READY_FOR_BESU_QBFT_EXTRA_DATA_ENCODING
```

## Deliberate HOLD

The importer does not build QBFT extra-data and does not bind the production
validator set.

These values remain false:

```text
production_extra_data_built=false
production_validator_set_bound=false
all_production_validators_epoch_domain_enforced=false
authoritative_chain2050_write=false
migration_authorized=false
public_activation_authorized=false
funds_movement=false
```

The next step after importing a real Alienware attestation is the existing
production extra-data preflight and Besu RLP encoding lane.

## Authority

This is a public-data transformation only. It does not:

- read the Alienware private node key;
- start or restart Besu;
- mutate a validator;
- contact production RPC;
- construct, sign, submit, or broadcast a transaction;
- write Chain-2050;
- move VOID, WC, liquidity, treasury assets, or funds; or
- authorize migration or public activation.

Verification:

```bash
node scripts/prove_void_economic_epoch2_qbft_fourth_identity_import_v1.mjs
```
