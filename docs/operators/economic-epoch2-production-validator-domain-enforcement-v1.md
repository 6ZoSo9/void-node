# Epoch-2 production validator raw-domain enforcement evidence v1

Marker: `VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_ENFORCEMENT_V1`

Status: source-only evidence contract.

## Canonical validator set

The complete production identity set is:

- Precision
- Nimo
- Xiphos

The topology is three validators with Besu quorum two and Byzantine fault
tolerance zero.

The identity-count gate is no longer a blocker:

```text
attested_live_node_count=3
required_live_node_count=3
attested_identity_slots_remaining=0
```

The remaining blocker is real runtime evidence from all three machines.

## Evidence contract

Each of the three production validators must have one content-addressed
`voide2ve1_<sha256>` evidence row binding:

- machine role and VOID node ID;
- exact Besu validator address and public key;
- public identity attestation SHA-256;
- Chain ID 2050 / execution epoch 2;
- Besu 26.8.1 and pinned image;
- canonical epoch-domain plugin JAR;
- plugin loaded and validation rule registered;
- local unmarked raw transaction rejected;
- raw public RPC disabled;
- fail-closed startup on plugin mismatch;
- merged peer-import rejection proof identity; and
- a bounded observation-validity window.

The verifier requires one row for each canonical production binding entry.

## Deliberate HOLD

Structurally valid candidate rows are not enough by themselves to prove that
the real machines produced them. Therefore:

```text
upstream_runtime_evidence_semantically_verified=false
all_production_validators_epoch_domain_enforced=false
cross_epoch_replay_protection_proven=false
```

A later runtime importer must verify the real Precision, Nimo, and Xiphos
evidence before those gates advance.

No fourth identity is required for launch. A future fourth validator is a
separate safety/topology expansion.

## Authority

Pure source classification. No filesystem write, service action, RPC,
validator mutation, key/wallet access, transaction, Chain-2050 write,
token/funds movement, migration, or public activation.
