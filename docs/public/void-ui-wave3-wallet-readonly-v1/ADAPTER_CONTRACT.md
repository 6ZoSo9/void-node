# Wave 3 Wallet Adapter Contract

## Public app route

- `/app/#/wallet`

## Loopback-only adapter

- `GET /__void/ui/wave3/wallet.json?account=<account-id>`
- `HEAD /__void/ui/wave3/wallet.json?account=<account-id>`
- `GET /__void/ui/wave3-wallet-v1/status.json`
- `HEAD /__void/ui/wave3-wallet-v1/status.json`

Non-loopback requests return `404`. Other methods return `405`.

## Account rule

The account ID must match:

```text
^[A-Za-z0-9._:-]{1,128}$
```

This is a participant account key, not necessarily an Ethereum address. Any
attached wallet address is read from the sanitized wallet-status source.

## Fixed sources

- `/__void/participant/wallet/status?account=<account-id>`
- `/wc/balance?account=<account-id>`
- `/wc/production/balance?account=<account-id>`

The adapter never calls wallet export or any POST route. Raw source bodies are
not returned to the browser.

## Authority boundary

Browser wallet connection, wallet create/import/unlock/export, wallet send,
WC-to-VOID, ledger write, validator mutation, operator mutation, and money
movement are all false.
