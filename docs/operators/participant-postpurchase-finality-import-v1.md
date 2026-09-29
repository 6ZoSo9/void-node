# Participant post-purchase finality import v1

Marker: `VOID_PARTICIPANT_POSTPURCHASE_FINALITY_IMPORT_V1`

Status: source-only importer for a future real
`VOID_PARTICIPANT_POSTPURCHASE_FINALITY_V1` receipt.

This lane does not contact production RPC, submit a transaction, access a wallet
or signer, mutate Chain-2050, activate WC/VOID or the presale, or move funds.

## Purpose

The finality verifier can independently bind one purchase delivery to one
participant-signed VoidToken control transfer. That receipt must still be bound
to the exact purchase/control event under review before it can become durable
launch evidence.

The importer supplies that binding without reducing the evidence to a bare
boolean.

## Reviewed expected binding

The caller must provide exact expected values for:

- Buy VOID delivery transaction hash;
- delivery receipt evidence fingerprint;
- participant address;
- exact delivered token amount;
- participant-control transaction hash;
- control transfer recipient;
- control transfer amount;
- minimum delivery confirmation count; and
- minimum control confirmation count.

The importer content-addresses these expectations as:

`voidppfrb1_<sha256>`

A valid receipt for another purchase, participant, or control transaction is
rejected.

## Receipt verification

The importer independently requires:

- marker/schema and Chain 2050 / execution epoch 2;
- recomputed `sha256:<hex>` finality evidence ID;
- canonical Epoch-2 VoidToken;
- control block not earlier than delivery block;
- no delivery-confirmation regression;
- observed control confirmations at or above the verifier's own required
  confirmation count;
- delivery and control confirmations at or above the reviewed importer minima;
- control amount no greater than the delivered lot;
- exact delivery/submission receipt binding booleans;
- stable second-read delivery and control receipt proofs;
- exact read-only finality authority; and
- only `eth_chainId`, `eth_getTransactionReceipt`, and
  `eth_blockNumber` in the recorded RPC method set.

## Deliberate runtime boundary

The current finality verifier accepts an **injected** read-only transport and
reports:

`runtime_or_launch_evidence=false`

Therefore a verified import may report:

```text
participant_control_finality_evidence_imported=true
participant_post_purchase_voidtoken_control_ready=false
production_runtime_binding_required=true
coupled_candidate_updated=false
```

This prevents a deterministic/test or otherwise unproven transport from
silently satisfying the live coupled launch gate.

A later runtime-evidence wrapper must prove that the imported finality receipt
came from the intended production Chain-2050 runtime before
`participant_post_purchase_voidtoken_control_ready` may become true.

## Authority boundary

The importer performs only source-evidence validation and candidate-field
derivation. It has no filesystem write, RPC, credentials, wallet/signer,
private-key, transaction, Chain-2050 write, token movement, market/presale
activation, or funds-movement authority.

Verification:

```bash
node scripts/prove_void_participant_postpurchase_finality_import_v1.mjs
```
