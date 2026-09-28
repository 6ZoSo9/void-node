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
- confirmed original Buy VOID delivery;
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
2. successful receipt for the submitted transaction hash;
3. receipt `from` exactly the participant;
4. receipt `to` exactly canonical `VoidToken`;
5. positive receipt block number and canonical block hash;
6. at most 1,024 receipt logs;
7. exactly one canonical `Transfer(address,address,uint256)` log from the token;
8. transfer `from`, recipient, and amount exactly matching the submitted
   participant transfer;
9. canonical head at or beyond the receipt block;
10. a caller-supplied positive confirmation requirement, bounded at 1,000; and
11. a second receipt read after the confirmation check with identical
    transaction/block/Transfer semantics.

Receipt disappearance, changed block hash, changed log index, changed transfer
semantics, insufficient confirmations, wrong chain, or a reverted transaction
all fail closed.

## Evidence identity

A GREEN decision emits a content-addressed
`void.participant-postpurchase-finality-evidence.v1` record containing:

- chain/execution epoch;
- transaction hash;
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
