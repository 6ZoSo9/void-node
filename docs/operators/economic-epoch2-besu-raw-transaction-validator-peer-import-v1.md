# Epoch-2 Besu raw-domain peer-import validation v1

Marker: `VOID_ECONOMIC_EPOCH2_BESU_RAW_TRANSACTION_VALIDATOR_PEER_IMPORT_V1`

Status: hosted disposable runtime proof only. This lane does not install a
plugin on any production validator and does not promote the general cross-epoch
replay gate.

## Purpose

The canonical Epoch-2 Besu plugin has already been source-tested and
content-addressed. Local RPC rejection proves the rule participates in
transaction admission, but production consensus safety also requires the rule to
apply when a block arrives from a peer.

Besu 26.8.1 implements plugin transaction rules through
`ExtendableTransactionValidator`, and Besu's own acceptance suite exercises
plugin rejection during imported block validation. This VOID lane proves the
same property with the exact sealed VOID plugin artifact.

## Canonical inputs

Pinned Besu image:

```text
hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042
```

Canonical plugin JAR SHA-256:

```text
6637c57b64666e7761a8e254e7968a60f4a80bef05e070be8e8b934d887d5518
```

The hosted job builds the plugin from merged repository source and refuses to
continue unless the resulting JAR matches that exact identity.

## Disposable topology

The proof creates one isolated Docker network with:

1. **producer**
   - sole QBFT validator;
   - no VOID transaction-domain plugin;
   - loopback-mapped RPC only;

2. **observer**
   - not a QBFT validator;
   - exact canonical VOID plugin mounted read-only;
   - loopback-mapped RPC only.

Both nodes use the same disposable Chain-2050 genesis. The observer is peered to
the producer and first proves it can synchronize the producer chain.

## Adversary

A fresh in-memory ephemeral wallet signs one Chain-2050 EIP-1559 transaction
with:

- nonce 0;
- zero native value;
- zero fee;
- an empty access list; and therefore
- **no Epoch-2 raw-transaction marker**.

The transaction is submitted only to the no-plugin producer. The producer must
accept and mine it.

The plugin observer must then:

- report a bad imported block containing that exact transaction hash;
- return no receipt for the forbidden transaction; and
- remain below the forbidden block rather than importing it.

This demonstrates the exact sealed plugin rule participates in peer block
validation rather than only local JSON-RPC admission.

## Gate boundary

A green hosted proof may establish only:

```text
exact_plugin_peer_import_protocol_rejection_proven=true
```

It deliberately keeps:

```text
all_production_validators_epoch_domain_enforced=false
cross_epoch_replay_protection_proven=false
migration_authorized=false
public_activation_authorized=false
```

Production enforcement still requires exact installation/configuration evidence
for every selected production validator.

## Authority boundary

The hosted proof:

- uses only fresh ephemeral test keys;
- contacts no production RPC;
- installs no plugin on operator hosts;
- performs no operator service action;
- mutates no production validator;
- writes no authoritative Chain-2050 state;
- moves no VOID, WC, liquidity, treasury assets, or funds; and
- authorizes no migration or public activation.

Verification:

```bash
node scripts/prove_void_economic_epoch2_besu_raw_transaction_validator_peer_import_v1.mjs source
bash scripts/run_void_economic_epoch2_besu_raw_transaction_validator_peer_import_v1.sh
```
