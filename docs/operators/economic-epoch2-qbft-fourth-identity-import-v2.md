# Epoch-2 QBFT generic fourth identity import v2

Marker:

`VOID_ECONOMIC_EPOCH2_QBFT_FOURTH_IDENTITY_IMPORT_V2`

Status: **source importer green candidate; a real fourth machine is still required**.

## Purpose

The canonical production QBFT binding currently has three live identities:

- Precision;
- Nimo; and
- Xiphos.

The production minimum remains four.

The historical v1 importer hardcoded the retired `alienware` role. V2 removes
that machine-specific assumption and accepts any replacement role that already
satisfies the generic local identity-preparation contract.

This does **not** create a fourth validator. It only makes the deterministic
public-data import path ready for whichever replacement machine is eventually
available.

## Generate the public identity on the replacement machine

Use the existing generic local preparation tool:

```bash
node ops/common/void-economic-epoch2-qbft-local-identity-prepare-v1.mjs \
  --machine-role <replacement-role> \
  --node-base http://127.0.0.1:<local-port>/ \
  --output "$HOME/Downloads/void_epoch2_qbft_identity_<replacement-role>_public_candidate_v1.json"
```

The role must match:

`^[a-z0-9][a-z0-9-]{0,31}$`

The prep tool also accepts loopback IPv6.

The private Besu node key remains under the replacement machine's private local
custody root. The importer reads only the exported public attestation.

## Exact validation

V2 requires:

- exact public-attestation object shape with no extra fields;
- canonical lowercase machine role matching the generic role regex;
- loopback-only HTTP node base with an explicit port;
- Besu 26.8.1 and the pinned production image digest;
- one uncompressed secp256k1 public key;
- exact public-key-to-validator-address derivation;
- role-derived private local-attestation filename;
- false private-key export flags;
- false validator/chain/funds authority flags;
- attestation bytes that parse to the exact supplied object; and
- uniqueness against all three currently bound production identities.

The canonical repository path is derived from the role:

```text
ops/mainnet0/economic-epoch2-qbft-node-identity-<role>-v1.json
```

## Output bundle

The CLI emits:

```text
economic-epoch2-qbft-node-identity-<role>-v1.json
economic-epoch2-qbft-validator-binding-candidate-v1.json
void-economic-epoch2-qbft-fourth-identity-import-v2.json
```

A valid real fourth public identity moves only the **preflight** to:

```text
attested_live_node_count=4
required_live_node_count=4
attested_identity_slots_remaining=0
preflight_status=READY_FOR_BESU_QBFT_EXTRA_DATA_ENCODING
```

## Deliberate HOLD

V2 does not build QBFT extraData, start a validator, install the raw-domain
plugin, bind the production validator set, or claim domain enforcement.

It preserves false:

```text
production_extra_data_built=false
production_validator_set_bound=false
all_production_validators_epoch_domain_enforced=false
authoritative_chain2050_write=false
migration_authorized=false
public_activation_authorized=false
funds_movement=false
```

After a real fourth identity is imported, the already-reviewed extraData/genesis
and validator-domain-enforcement lanes remain separate gates.

## Authority boundary

Public-data transformation only. No service action, private-key read, validator
mutation, production RPC, transaction construction/signing/submission/broadcast,
Chain-2050 write, token/funds movement, migration, or activation occurs.

Verification:

```bash
node scripts/prove_void_economic_epoch2_qbft_fourth_identity_import_v2.mjs
```
