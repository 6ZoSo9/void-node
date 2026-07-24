# Buy VOID request transaction-hash binding v1

This lane adds a local-operator mutation route for attaching a real Base or
Ethereum payment transaction hash to an existing Buy VOID presale request.

## Route

`POST /__void/buy-void/operator/request/tx-hash.json`

Required JSON fields:

- `request_id`
- `tx_hash`
- `confirm: "bindBuyVoidPaymentTxHash"`

A GET request returns `405` and identifies the required POST method and
confirmation token.

## Guards

The route is local-only. It rejects malformed request IDs and transaction
hashes, missing requests, requests not awaiting a payment hash, attempts to
replace an existing different hash, and reuse of a transaction hash already
bound to another request.

Submitting the same hash to the same already-updated request is idempotent and
does not write another request record.

Successful binding changes the request status from
`awaiting_payment_tx_hash` to
`payment_submitted_pending_manual_review`. It does not verify payment, reserve
presale inventory, enable fulfillment, or transfer VOID.
