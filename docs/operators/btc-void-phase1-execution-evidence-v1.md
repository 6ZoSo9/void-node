# BTC/VOID Phase-1 structural evidence preview v1

Marker:

`VOID_BTC_VOID_PHASE1_EXECUTION_EVIDENCE_STRUCTURAL_PREVIEW_V1`

Status:

`PHASE1_EXECUTION_EVIDENCE_STRUCTURAL_PREVIEW_NOT_ADMITTED`

## Purpose

The merged Phase-1 source validator checks the shape, identities, content
addressing, required case coverage, source-model bindings, and non-production
authority boundary of a proposed Bitcoin-regtest / isolated Chain-2050 evidence
suite.

That validation is useful, but caller-supplied JSON is **not execution
provenance**. A digest of supplied JSON proves only the content of that JSON; it
does not prove that Bitcoin Core or an isolated Chain-2050 client produced the
claimed observations.

For that reason this contract now emits a structural preview only. It does not
admit Phase-1 execution evidence.

## Backward-compatible safety boundary

The existing exported function
`admitBtcVoidPhase1ExecutionEvidenceV1(...)` remains callable so existing
source consumers fail safe. It delegates to
`previewBtcVoidPhase1ExecutionEvidenceV1(...)` and returns the same preview
object.

Neither entrypoint can emit:

- marker `VOID_BTC_VOID_PHASE1_EXECUTION_EVIDENCE_V1`;
- status `PHASE1_EXECUTION_EVIDENCE_ADMITTED_NONPRODUCTION`;
- an `evidence_suite_id` with the former admission meaning; or
- true Bitcoin-regtest / isolated Chain-2050 execution-admission flags.

The preview uses `voidbtcp1preview1_<sha256>`.

## What the preview still validates

The structural validator still requires the complete 12-case Phase-1 shape:

1. `btc_to_void_success`
2. `void_to_btc_success`
3. `btc_refund`
4. `chain2050_refund`
5. `wrong_preimage_rejected`
6. `wrong_amount_rejected`
7. `wrong_script_rejected`
8. `premature_claim_rejected`
9. `timeout_refund`
10. `replay_rejected`
11. `restart_recovery`
12. `reorg_reconciliation`

It retains the reviewed source-model and fee-policy checks, Bitcoin regtest
genesis identity, isolated Chain-2050 epoch/genesis identity, case/content IDs,
restart/reorg/rejection shapes, and explicit no-production authority boundary.

These are structural constraints only.

## Why hashes are insufficient

The following fields remain useful for future observer binding, but are not
accepted as provenance by themselves:

- `raw_rpc_transcript_sha256`;
- `receipt_set_sha256`;
- restart/reorg/rejection `evidence_sha256` values;
- caller-supplied transaction/block identifiers;
- `same_preimage_domain=true`; and
- source-only atomic invariant booleans.

Without the underlying reviewed evidence bytes or independently verified
observer receipts, these values can be fabricated while remaining internally
content-addressed.

## Required future execution-admission gate

A later issue #2330 implementation may introduce an authority-bearing execution
admission only after reviewed observers provide independently rederived
evidence, including at minimum:

- Bitcoin regtest observer receipts bound to raw RPC transcript/selected
  response bytes, exact Core/regtest identity, transaction IDs, block identity,
  ancestry, and reorg evidence;
- isolated Chain-2050 observer receipts bound to exact client/genesis identity,
  transaction/receipt/block/state bytes, and independently rederived receipt
  identities;
- restart/rejection evidence bound to exact content-addressed bytes rather than
  bare booleans or unattached hashes;
- cross-rail hashlock/preimage-domain identity rederived from the executed rail
  artifacts;
- trade-funded fee-envelope arithmetic rederived from executed amounts/fees;
  and
- native-unit conservation and terminal idempotence rederived from executed
  debits, credits, receipts, and terminal state.

Until that gate exists:

```text
bitcoin_regtest_execution_evidence_admitted=false
isolated_chain2050_execution_evidence_admitted=false
execution_provenance_verified=false
observer_receipts_required_for_execution_admission=true
```

## Deliberate authority boundary

This source slice does **not**:

- invoke Bitcoin JSON-RPC or `bitcoin-cli`;
- invoke Chain-2050 RPC;
- construct, sign, submit, or broadcast a transaction;
- access wallets, signers, private keys, or credentials;
- reserve production BTC/VOID inventory;
- contact Bitcoin mainnet;
- contact production Chain-2050;
- seed liquidity or treasury funds;
- activate the BTC/VOID market or presale; or
- move production funds.

## CLI

The preview validator reads one bounded JSON suite from stdin:

```bash
node tools/void-btc-void-phase1-execution-evidence-v1.mjs --pretty < phase1-suite.json
```

A structurally valid result has a content-addressed preview ID:

```text
voidbtcp1preview1_<sha256>
```

This ID identifies the validated JSON structure. It is not proof of rail
execution.
