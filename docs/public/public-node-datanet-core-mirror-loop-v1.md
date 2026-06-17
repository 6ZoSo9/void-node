# VOID DataNet Core Mirror Loop v1

Marker: `VOID_DATANET_CORE_MIRROR_LOOP_V1`

Proof marker: `VOID_DATANET_CORE_MIRROR_LOOP_PROOF_V1_GREEN`

## Purpose

DataNet Core Mirror Loop v1 proves the first core publish/fetch/mirror/verify loop:

1. read a public-safe DataNet published manifest,
2. fetch each object by SHA-256 from the public object route,
3. verify each fetched object's SHA-256,
4. verify byte counts against the manifest,
5. write a local mirror object set,
6. write a public-safe mirror receipt.

## Safety boundary

This lane is core DataNet behavior, not Work Credit settlement.

- `public_mutation=false`
- `ledger_write=false`
- `wc_credit_award=false`
- no public upload
- no shell execution from public input
- no absolute path disclosure
- no operator home path disclosure
- no local mirror path disclosure in the public-safe receipt

## Local proof

```bash
BASE=http://127.0.0.1:4100 ops/mainnet0/datanet-core-mirror-loop-v1-proof.sh
Core direction

This is the pivot from proof-surface scaffolding back to network behavior:

publish -> manifest -> object fetch -> mirror -> verify -> receipt
