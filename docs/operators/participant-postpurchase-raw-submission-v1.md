# Participant post-purchase raw submission v1

Marker: `VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_V1`

Status: source-only submission seam with explicit apply confirmation and injected
transports. No runtime route or public submission endpoint is enabled by this
source.

## Purpose

The participant post-purchase control primitive proves that a delivered
`VoidToken` recipient can sign a canonical Chain-2050 ERC-20 transfer without
giving the node their private key.

This seam adds the next bounded step: submit that **already-signed participant
transaction** without converting it into a project-custodied transaction.

## Preconditions before mutation

An apply call must satisfy all of these before `eth_sendRawTransaction` can be
reached:

1. exact confirmation string
   `submitApprovedParticipantPostpurchaseVoidTokenTransfer`;
2. an explicitly injected read-only delivery-reconciliation transport;
3. the existing Buy VOID ERC-20 receipt reconciler must independently return a
   confirmed Chain-2050 delivery;
4. raw transaction signature recovers to the confirmed delivery recipient;
5. raw transaction is type 2, Chain 2050, target canonical `VoidToken`;
6. native value, max fee, and priority fee are all zero;
7. calldata is exact ERC-20 `transfer(address,uint256)`;
8. transfer amount is positive and no greater than the confirmed delivered lot;
9. an explicitly injected Chain-2050 broadcast transport is present; and
10. the broadcaster's startup/per-send chain identity probes both resolve to
    Chain 2050.

There is no built-in network transport in this module.

## Submission behavior

The seam reuses the established Chain-2050 broadcaster contract:

- one startup `eth_chainId` probe;
- one immediate pre-send `eth_chainId` probe;
- at most one `eth_sendRawTransaction`;
- no automatic retry;
- local raw-transaction hash must equal the accepted provider hash;
- raw signed transaction is not persisted or returned; and
- an accepted result carries the exact reconciled purchase-delivery identity
  needed by finality: delivery transaction hash, receipt block/hash, transfer-log
  index, receipt evidence fingerprint, fulfillment wallet, delivered atom amount,
  and observed delivery confirmation count.

If submission fails before the provider may have accepted bytes, the result is
held with `submission_may_have_occurred=false`.

If the send request may have reached the provider, the provider response is
ambiguous, the transport throws after send may have begun, or a returned hash
does not match the locally derived transaction hash, the result is:

`ambiguous_reconciliation_required`

with `automatic_retry=false`.

That state must be reconciled by transaction hash before any further send is
considered.

## Finality boundary

An accepted `eth_sendRawTransaction` response is not finality evidence.

The current seam therefore keeps all of these false:

- `receipt_finality_verified`;
- `authoritative_chain2050_write_verified`;
- `token_movement_confirmed`;
- `funds_movement_confirmed`; and
- `participant_postpurchase_voidtoken_control_ready`.

A later receipt/finality seam must independently re-read both the original
purchase-delivery receipt and the exact participant transaction, recompute the
delivery evidence fingerprint, and prove both remained stable on canonical Chain
2050 before the durable coupled gate can advance.

## Runtime boundary

This source does not mount a route and does not open public submission.
Production exposure still requires an explicit runtime composition, request
authentication/rate limiting, bounded payload admission, reconciliation of
ambiguous sends, receipt/finality verification, and a production canary.

## Authority

The source can submit a transaction **only when** an external caller supplies
both transports, sets `apply=true`, and supplies the exact confirmation.
Therefore the authority record honestly marks transaction/token/funds movement
as potentially reachable when explicitly injected and called.

It still has no:

- participant private-key or wallet access;
- transaction construction or signing;
- built-in network transport;
- automatic retry;
- raw transaction persistence/output;
- runtime route;
- public submission opening; or
- receipt/finality authority.

Hosted proof uses only deterministic mock transports and performs no network
request or Chain-2050 mutation.

Verification:

```bash
npx tsx scripts/prove_void_participant_postpurchase_raw_submission_v1.ts
```
