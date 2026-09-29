# Epoch-2 production validator raw-domain enforcement evidence v1

Marker:

`VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_V1`

Status: source-only evidence contract. This lane does not install the plugin,
start/restart Besu, mutate the validator set, or claim production enforcement.

## Current canonical state

The canonical QBFT binding currently contains three independently attested live
validator identities:

- Precision;
- Nimo; and
- Xiphos.

The production QBFT minimum remains four, so the canonical verifier returns:

```text
HOLD
production_validator_identity_set_incomplete
attested_live_node_count=3
required_live_node_count=4
attested_identity_slots_remaining=1
all_production_validators_epoch_domain_enforced=false
```

The existing local identity-preparation tool already supports a generic machine
role and documents an Alienware example. No new key-generation source is needed
for the fourth slot.

## Evidence contract

Once the final four canonical QBFT identities exist, each production validator
must have one content-addressed evidence candidate:

`voide2ve1_<sha256>`

Each row binds:

- machine role;
- VOID node ID;
- exact Besu validator address and public key;
- exact public identity attestation SHA-256;
- Chain ID 2050 / execution epoch 2;
- Besu 26.8.1;
- pinned Besu image digest;
- exact canonical plugin name;
- exact canonical plugin JAR SHA-256;
- plugin loaded;
- transaction-validation rule registered;
- local unmarked raw transaction rejected;
- raw public RPC disabled;
- startup fail-closed on plugin mismatch;
- the exact merged peer-import proof source head/run;
- a bounded observation-validity window; and
- no migration, activation, or funds authority.

The verifier requires a one-to-one ordered evidence row for each canonical QBFT
binding entry and a caller-pinned expected evidence ID for every row.

## Deliberate non-authoritative boundary

A set of structurally valid, content-addressed evidence rows is still not
sufficient by itself to prove that production machines actually produced those
rows.

Therefore the strongest source result is:

```text
ENFORCEMENT_EVIDENCE_CANDIDATE_VALID_UPSTREAM_RUNTIME_UNVERIFIED
upstream_runtime_evidence_semantically_verified=false
all_production_validators_epoch_domain_enforced=false
cross_epoch_replay_protection_proven=false
```

A later operator/runtime importer must independently verify the real machine
evidence before migration can promote the production-enforcement gate.

## Fourth identity

The existing safe preparation tool is:

`ops/common/void-economic-epoch2-qbft-local-identity-prepare-v1.mjs`

It accepts roles matching:

`^[a-z0-9][a-z0-9-]{0,31}$`

and already documents:

```bash
node ops/common/void-economic-epoch2-qbft-local-identity-prepare-v1.mjs \
  --machine-role alienware \
  --node-base http://127.0.0.1:4100/ \
  --output "$HOME/Downloads/void_epoch2_qbft_identity_alienware_public_candidate_v1.json"
```

That tool keeps the node private key local and off-repository. Running it remains
a separate operator action and is not performed by this source lane.

## Authority boundary

This verifier is pure source classification. It performs no filesystem write,
service action, RPC call, validator mutation, key/wallet access, transaction,
Chain-2050 write, token/funds movement, migration, or public activation.

Verification:

```bash
node scripts/prove_void_economic_epoch2_production_validator_domain_enforcement_v1.mjs
```
