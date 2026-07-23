# Public App Composition Gateway v1

The public app composition gateway repairs the production boundary between the
public node UI, the Public Earn Gateway, and the loopback-only VOID App.

It listens on `127.0.0.1:8082` and is designed to become the Tailscale Funnel
target after a separate, explicit cutover.

## Composition

- Existing public proof and earning routes continue through the existing
  gateway on `127.0.0.1:8080`.
- `/app/*` assets are fetched from the loopback node on `127.0.0.1:4100`.
- Public Home and Network state are synthesized from exact read-only node
  sources.
- Peer identities and addresses are removed.
- Wallet, Earn, jobs, receipts, Work Credit balances, and account enumeration
  remain unavailable to public visitors.

The public app explains that account-specific information requires a local node
or an authorized participant session.

## Public routes added

- `/app/`
- `/__void/public-app/status.json`
- `/__void/public-app/mode.json`
- `/__void/public-app/network.json`
- `/__void/ui/wave2/home.json`
- `/version` with sensitive local fields removed
- `/blocks/latest/number2.json`
- `/p2p/peers` with count-only peer placeholders

Compatibility aliases are also provided for three stale public runtime links.

## Non-scope

The gateway cannot write ledgers, run jobs, award Work Credits, connect wallets,
broadcast transactions, admit validators, alter operators, move money, or
expose private node routes.
