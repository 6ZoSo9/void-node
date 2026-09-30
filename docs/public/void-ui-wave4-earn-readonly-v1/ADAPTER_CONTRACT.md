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

## Browser transport ownership

The browser issues exactly one owned request to the fixed Wave-4 adapter route.
It reuses the shared public-App request owner and bounded JSON reader:

- maximum response body: 128 KiB;
- request timeout: 7 seconds;
- redirects rejected;
- exact final URL required for the submitted account route;
- same-origin mode with the existing same-origin credential policy;
- no referrer;
- JSON content type required;
- replacement requests cancel and retire the prior generation;
- clear and route/view departure invalidate any active generation; and
- stale success or stale failure from an older generation cannot update Earn
  DOM or session state.

The browser still makes zero direct requests to the underlying WC, jobs,
receipts, DataNet, or wallet source routes.

## Browser schema admission

After transport, account, and freshness admission, the browser closes the
successful Wave-4 response schema before any Earn DOM/session mutation.

The validator requires the exact top-level product shape and exact nested shapes
for node identity, earning state, available work, legacy/production/recent
accounting, last-credit evidence, recent jobs, verification receipts, DataNet
status, source metadata, sanitization, and authority boundaries.

Additional fail-closed rules include:

- history `count === items.length`, `limit=5`, and at most five rows;
- exact task/status labels for their canonical enum values;
- canonical nullable timestamps and safe references before history rendering;
- display strings must agree with their numeric evidence;
- available/unavailable accounting states must agree with nullable values;
- source routes are fixed literals and HTTP status must agree with source `ok`;
- history/source availability is cross-checked;
- every sanitization assertion is exactly `false`; and
- every published mutation/economic authority boundary is exactly `false`.

Missing fields, unknown fields, malformed types, contradictory evidence, or
elevated authority flags make the snapshot unavailable rather than partially
rendering fallback product claims.

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
