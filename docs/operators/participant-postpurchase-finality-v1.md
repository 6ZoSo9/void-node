# Participant post-purchase finality v1

Marker: `VOID_PARTICIPANT_POSTPURCHASE_FINALITY_V1`

Status: source-only, read-only finality verifier. This contract does not submit,
retry, construct, sign, or broadcast a transaction and does not mount a runtime
route.

## Purpose

The participant post-purchase control source proves a delivered participant can
sign a canonical Chain-2050 `VoidToken.transfer`. The raw-submission seam proves
that exact signed transaction can be submitted once through injected transports.

Neither provider acceptance nor transaction hash alone proves participant
control completed on canonical Chain 2050.

This seam closes the source mechanism needed to prove the exact participant
transaction was mined successfully and remained stable through a reviewed
confirmation depth.

## Input boundary

The verifier accepts only a prior
`VOID_PARTICIPANT_POSTPURCHASE_RAW_SUBMISSION_V1` result in state:

`submission_accepted_finality_required`

The result must already bind:

- Chain 2050;
- the participant address;
- canonical `VoidToken`;
- transfer recipient and amount;
- exact raw-transaction hash;
- exact original Buy VOID delivery transaction hash;
- delivery receipt block number/hash and Transfer-log index;
- delivery receipt evidence fingerprint;
- fulfillment wallet and exact delivered atom amount;
- prior observed delivery confirmation count;
- recovered participant signature;
- delivery-recipient/signer equality;
- canonical transfer calldata;
- zero native value;
- zero-gas-price Epoch-2 policy;
- exactly one submission/broadcast attempt; and
- no finality claim yet.

Ambiguous or held submission results are not finality-eligible.

## Read-only RPC boundary

There is no built-in HTTP/RPC client.

A caller must inject a transport, and the verifier only permits:

- `eth_chainId`;
- `eth_getTransactionReceipt`; and
- `eth_blockNumber`.

No transaction submission method is reachable.

## Receipt/finality proof

The verifier requires:

1. Chain ID exactly `2050`;
2. successful original Buy VOID delivery receipt at the exact carried delivery
   transaction hash/block identity;
3. delivery receipt `from` exactly the carried fulfillment wallet and `to`
   exactly canonical `VoidToken`;
4. exactly one delivery `Transfer` from the fulfillment wallet to the
   participant for the full delivered atom amount and exact carried log index;
5. an independently recomputed delivery evidence fingerprint exactly matching
   the carried reconciler fingerprint;
6. successful receipt for the submitted participant-control transaction hash;
7. control receipt `from` exactly the delivered participant;
8. control receipt `to` exactly canonical `VoidToken`;
9. the control transaction block not earlier than the delivery block;
10. at most 1,024 logs per inspected receipt;
11. exactly one canonical control `Transfer(address,address,uint256)` log from
    the participant, with recipient/amount exactly matching submission;
12. control amount no greater than the delivered lot;
13. canonical head at or beyond both receipt blocks and not regressed below the
    delivery confirmation count already observed by the purchase reconciler;
14. a caller-supplied positive control confirmation requirement, bounded at
    1,000; and
15. second reads of both delivery and control receipts after the confirmation
    check, each with identical transaction/block/Transfer semantics.

Delivery or control receipt disappearance, changed block/hash/log semantics,
delivery fingerprint drift, delivery/control participant mismatch, control before
delivery, insufficient confirmations, wrong chain, or a reverted transaction all
fail closed.

## Evidence identity

A GREEN decision emits a content-addressed
`void.participant-postpurchase-finality-evidence.v1` record containing:

- chain/execution epoch;
- original delivery transaction hash and receipt fingerprint;
- delivery fulfillment wallet, delivered atom amount, log index, block
  identity, and prior/current confirmation counts;
- participant-control transaction hash;
- participant and token;
- transfer recipient and amount;
- Transfer-log index;
- receipt block number/hash; and
- observed and required confirmation counts.

This makes the source result deterministic for the exact observation.

## Evidence boundary

The hosted proof uses an injected deterministic mock transport.

Therefore the source result deliberately records:

- `runtime_or_launch_evidence=false`;
- `runtime_route_active=false`;
- `public_submission_open=false`;
- no transaction submission or broadcast by this verifier;
- no authoritative Chain-2050 write by this verifier; and
- no token/funds movement by this verifier.

A later bounded read-only invocation against the accepted production Chain-2050
RPC and an actual participant-control transaction is still required before the
durable coupled candidate can claim live participant post-purchase control.

## Authority

No wallet/private-key access, transaction construction/signing/submission/
broadcast, Chain-2050 mutation, token movement, funds movement, market
activation, or public presale activation is authorized.

Verification:

```bash
node scripts/prove_void_participant_postpurchase_finality_v1.mjs
```
