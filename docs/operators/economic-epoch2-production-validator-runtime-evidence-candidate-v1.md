# Epoch-2 production validator runtime evidence candidate v1

Marker:

`VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_RUNTIME_EVIDENCE_CANDIDATE_V1`

Status: **source-ready machine-local disposable proof; production enforcement
still HOLD**.

## Purpose

Generate one real-machine `voide2ve1_<sha256>` runtime-enforcement evidence
candidate for each canonical production validator:

- Precision
- Nimo
- Xiphos

The proof uses the machine's existing Besu node identity but does **not** start,
stop, replace, or reconfigure an operator service.

## What the runner proves

For the selected canonical machine role, the runner requires:

- current hostname equals the canonical public identity hostname;
- loopback VOID `/health` reports the canonical VOID node ID;
- the machine-local Besu node key exists at the canonical private path;
- that private key derives the exact canonical Besu public key/address;
- the canonical epoch-domain plugin JAR SHA-256 matches;
- pinned Besu 26.8.1 is used;
- requested-plugin startup fails closed when the plugin is absent;
- the real plugin loads and registers the transaction validator rule;
- legacy/missing/wrong/duplicate marker transactions are rejected;
- one correctly marked type-2 transaction is accepted on the disposable chain;
- RPC is exposed only on a random `127.0.0.1` host port;
- no P2P port is published and discovery is disabled; and
- no production RPC is contacted.

The resulting evidence row matches the existing
`VOID_ECONOMIC_EPOCH2_PRODUCTION_VALIDATOR_DOMAIN_EVIDENCE_V1` contract.

## Private-key boundary

The local Besu node key is:

```text
~/.local/share/void/epoch2-qbft-validator-identity-v1/<role>/nodekey
```

The runner reads it locally only to:

1. derive and verify the canonical public identity; and
2. mount that exact file read-only into the disposable Besu container as the
   local QBFT node identity.

The key is never copied into the repository, evidence JSON, stdout, or another
machine.

The disposable container signs only its isolated local QBFT blocks. It has no
production peers and no production RPC contact.

## Plugin JAR input

The runner requires the already content-addressed canonical plugin JAR as an
explicit input path.

Required SHA-256:

```text
6637c57b64666e7761a8e254e7968a60f4a80bef05e070be8e8b934d887d5518
```

JAR acquisition/build is intentionally separate from the runtime-evidence
proof. The proof refuses any other JAR.

## Invocation

After the source lane is merged, on the matching machine:

```bash
bash scripts/run_void_economic_epoch2_production_validator_runtime_evidence_v1.sh \
  <precision|nimo|xiphos> \
  /path/to/void-epoch2-raw-transaction-domain-plugin-v1.jar \
  "$HOME/Downloads/void_epoch2_validator_runtime_evidence_<role>_v1.json"
```

The repository must be on clean `main`.

## Evidence lifetime

The candidate uses the actual run time as `observed_at_utc` and expires one
hour later. This is deliberately short because the next importer must validate
fresh evidence rather than preserve a stale claim indefinitely.

## Deliberate HOLD

A candidate row does not by itself promote:

```text
upstream_runtime_evidence_semantically_verified=false
all_production_validators_epoch_domain_enforced=false
cross_epoch_replay_protection_proven=false
migration_authorized=false
public_activation_authorized=false
```

All three fresh real-machine rows still require a separately reviewed importer
before the production enforcement gate can advance.

## Authority

The runner creates and destroys only disposable local Docker state and its
temporary proof directory. The only transaction accepted/mined is on that
isolated disposable Chain-2050 instance.

It performs no production service action, production RPC call, production P2P
connection, authoritative Chain-2050 write, validator-set mutation, token/funds
movement, migration, or activation.
