# Wave 4 Earn Adapter Contract

## Product route

- `/app/#/earn`

## Loopback-only adapter

- `GET /__void/ui/wave4/earn.json?account=<account-id>`
- `HEAD /__void/ui/wave4/earn.json?account=<account-id>`
- `GET /__void/ui/wave4-earn-v1/status.json`
- `HEAD /__void/ui/wave4-earn-v1/status.json`

Non-loopback requests return `404`. Other methods return `405`.

## Account rule

```text
^[A-Za-z0-9._:-]{1,128}$
```

The value is an explicit participant account key.

## Browser snapshot admission

Before the browser stores or renders Earn state, it requires:

- `ok=true`, the exact Wave-4 marker, `read_only=true`, and `network_name=Mainnet-0`;
- exact account shape `{ selected, id, label }`;
- `selected=true` and exact returned `id` / `label` equality with the submitted account;
- canonical UTC-millisecond `generated_at`;
- snapshot age no greater than 30 seconds;
- future clock skew no greater than 5 seconds; and
- freshness both at request start and at the later validation/render instant.

Malformed, stale, future, or account-mismatched snapshots fail closed before
session-storage promotion or rendering.

This boundary does not claim response-body size ownership, redirect/final-URL
ownership, or request-generation cancellation. Those remain separate transport
hardening seams.

## Fixed read-only sources

- `/wc/runner/status?account=<account-id>`
- `/wc/reward-stats?account=<account-id>`
- `/wc/redeemable?account=<account-id>`
- `/wc/production/balance?account=<account-id>`
- `/jobs?account=<account-id>&limit=5`
- `/receipts?account=<account-id>&limit=5`
- `/__void/participant/datanet-wc/status?account=<account-id>`

The adapter reshapes these sources into a bounded product contract. It never
returns raw source bodies.

## Sanitization

The response excludes absolute paths, wallet addresses, redeemed-event wallets,
job inputs, job metadata, receipt roots, receipt leaves, and raw receipt
payloads. History contains only bounded status, task labels, timestamps, reward
visibility, byte counts, and safe references.

## Authority boundary

Job execution, job submission, reward award, runner activation, runner tick,
runner configuration, WC redeem, WC send, WC-to-VOID, ledger write, browser
wallet connection, validator mutation, operator mutation, and money movement
are false.
