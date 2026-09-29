# Epoch-2 production QBFT validator-set attestation v1

Marker:

`VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_SET_ATTESTATION_V1`

Status: source-only read-only runtime evidence contract. No production RPC is
contacted by the hosted proof and the canonical
`production_validator_set_bound` gate remains false.

## Purpose

The repository already proves:

- the exact three canonical production QBFT identities:
  `precision`, `nimo`, and `xiphos`;
- the public-key-to-Besu-address derivations;
- production QBFT `extraData` for those three addresses;
- per-host validator identity/plugin runtime evidence; and
- all-production-validator raw-transaction epoch-domain enforcement.

Those facts do not by themselves prove that the **running production QBFT
chain** is currently using exactly those three validator addresses.

This lane defines the missing read-only attestation boundary.

## Per-host observation

Each machine-local observation uses an injected transport and exactly three
read-only JSON-RPC methods:

```text
eth_chainId
eth_getBlockByNumber
qbft_getValidatorsByBlockNumber
```

The caller pins one explicit positive block number. The collector requires:

- Chain ID exactly 2050;
- the returned block number to equal the requested block;
- a canonical nonzero block hash;
- exactly three unique validators;
- the validator set to equal the canonical three Besu addresses from
  `economic-epoch2-qbft-validator-binding-candidate-v1.json`; and
- the local machine's canonical validator address to be present.

The evidence row is content-addressed as:

`voide2vs1_<sha256>`

and remains non-authoritative:

```text
production_validator_set_bound=false
authoritative_chain2050_write=false
migration_authorized=false
public_activation_authorized=false
funds_movement_authorized=false
```

## Three-host attestation

The set verifier requires one fresh row for each role in canonical order:

```text
precision
nimo
xiphos
```

All three rows must independently agree on:

- the same block number;
- the same block hash;
- the same canonical validator-set SHA-256; and
- the exact same three-address validator set.

Freshness is evaluated at one explicit common evaluation timestamp. Each row has
a maximum one-hour validity window.

A successful source verification reports:

```text
production_validator_set_runtime_evidence_semantically_verified=true
common_block_identity_verified=true
exact_canonical_validator_set_verified=true
all_three_hosts_agree=true
production_validator_set_bound=false
```

The final boolean remains false because this source lane does not publish or
promote real runtime evidence. A later per-host evidence/publication/promotion
lane must independently bind actual production observations before canonical
migration readiness can advance.

## Authority boundary

The source requires an injected read-only transport but constructs no network
client itself. It has no authority for:

- filesystem mutation;
- service action;
- validator mutation/votes;
- wallets/private keys/credentials;
- transaction construction/signing/submission/broadcast;
- authoritative Chain-2050 writes;
- token/funds movement;
- migration; or
- public activation.

Verification:

```bash
node scripts/prove_void_economic_epoch2_production_validator_set_attestation_v1.mjs
```
