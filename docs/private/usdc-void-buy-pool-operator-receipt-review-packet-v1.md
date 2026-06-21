# VOID USDC/VOID Buy Pool Operator Receipt Review Packet v1

Marker: `VOID_USDC_VOID_BUY_POOL_OPERATOR_RECEIPT_REVIEW_PACKET_V1`

Status: `private_operator_review_packet_only`

This is a private/operator-facing receipt review packet for the USDC/VOID fixed-price buy pool.

It does not create, expose, or imply:

- a public receipt intake endpoint,
- a public receipt mutation route,
- an automatic receipt acceptance path,
- an automatic fulfillment path,
- a public buyer queue,
- a wallet send action,
- a private key action,
- a token delivery promise,
- an investment return, yield, or profit promise.

## Scope

This packet defines the manual review checklist an operator should complete before treating any USDC transaction as a candidate buy-pool receipt.

The public buyer-facing page tells buyers to preserve:

- Base USDC transaction hash,
- exact sending wallet address,
- USDC amount sent,
- approximate send timestamp or block time,
- receiver address used,
- possible wallet proof from the sending wallet.

This private packet tells the operator how to review those facts without creating a public mutation.

## Required input from buyer

Before review, the buyer should provide:

1. `tx_hash`: Base transaction hash.
2. `sender_wallet`: exact wallet that sent USDC.
3. `amount_usdc`: amount sent.
4. `receiver_address`: address the USDC was sent to.
5. `send_time_or_block`: approximate timestamp or block.
6. `optional_delivery_wallet`: only if different from sender wallet, and only for separate operator review.
7. `wallet_proof`: optional unless requested; should come from the same sending wallet.

## Operator verification checklist

The operator must verify, manually and explicitly:

1. **Chain check**
   - Transaction is on the accepted chain for the current buy pool.
   - Expected current public configuration: `accepted_chain = base`.

2. **Asset check**
   - Transfer is USDC, not native ETH and not an unrelated token.
   - Token decimals and amount must be interpreted as USDC.

3. **Receiver check**
   - Receiver matches the current configured VOID buy-pool receiving address.
   - Do not rely on a pasted receiver address alone; compare against the live public buy-pool configuration and operator environment.

4. **Sender identity check**
   - Sender wallet is the receipt identity.
   - Sender wallet is the default fulfillment identity unless a separate operator-approved record explicitly says otherwise.

5. **Exchange / pooled custody check**
   - Reject or hold for manual escalation if the sender appears to be a centralized exchange, pooled custody service, bridge, payment processor, or any service that hides the true buyer wallet.
   - Public buyer instructions warn that exchange or pooled sends may break attribution.

6. **Amount check**
   - Confirm USDC amount.
   - Compute expected VOID using the fixed price.
   - Current public terms: `0.50 USDC per VOID`, equivalent to `2 VOID per 1 USDC`.
   - Never promise delivery solely from this computation; it is review evidence only.

7. **Pool capacity check**
   - Confirm the buy-pool allocation has not been fully drained.
   - Current public allocation: `10,000,000 VOID`.
   - Current public max raise: `5,000,000 USDC`.
   - Pool locks/closes once the allocation is drained.

8. **Duplicate check**
   - Search any private/operator receipt records for the same `tx_hash`.
   - A duplicate tx hash must not create a second candidate fulfillment.

9. **Redaction check**
   - Public surfaces must not expose private buyer details beyond deliberately redacted/public evidence.
   - Do not publish raw buyer contact details, private queue state, internal notes, or secrets.

10. **Decision record check**
   - Any later fulfillment decision must have an explicit operator-approved record.
   - This review packet alone is not a fulfillment decision.

## Review result states

Allowed review states:

- `not_reviewed`
- `needs_more_info`
- `invalid_wrong_chain`
- `invalid_wrong_asset`
- `invalid_receiver`
- `invalid_exchange_or_pooled_sender`
- `duplicate_tx_hash`
- `valid_receipt_candidate`
- `ready_for_separate_operator_fulfillment_review`
- `rejected`

No state in this packet performs fulfillment.

## Manual calculation rule

Given:

- `amount_usdc`
- `price_usdc_per_void = 0.50`

Then:

- `candidate_void_amount = amount_usdc / 0.50`
- equivalently: `candidate_void_amount = amount_usdc * 2`

This is a candidate calculation only. It is not an automatic award, automatic fulfillment, or delivery promise.

## Safety boundary

This packet is private/operator-facing documentation only.

Safety flags:

- `private_operator_review_packet_only = true`
- `public_receipt_intake_endpoint_open = false`
- `public_receipt_mutation_enabled = false`
- `automatic_receipt_acceptance_enabled = false`
- `automatic_fulfillment_enabled = false`
- `wallet_send_enabled = false`
- `private_key_action_enabled = false`
- `public_queue_exposed = false`
- `secret_exposure_allowed = false`
- `route_added = false`
- `src_index_modified = false`
