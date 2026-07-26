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


## Operator notification receiver route

The source includes a disabled-by-default exact proxy route:

- Operator-notification ingress is not served by the public-app composition gateway.

The route is unavailable unless the composition gateway receives the
operator-local environment binding
`VOID_OPERATOR_WEBHOOK_RECEIVER_UPSTREAM=http://127.0.0.1:4186` belongs to the isolated AI-agent public gateway service, not this composition gateway.

The gateway requires JSON, a bearer authorization header, a matching raw-body
SHA-256 header, no query string, and a bounded request body. It follows no
redirects and proxies no other receiver path. The loopback receiver performs
the actual token comparison, payload validation, duplicate suppression, and
append-once receipt write.

### Receiver ingress ownership

The dormant compatibility implementation in the composition source is not the
installed production ingress. Live ownership is the isolated AI-agent gateway
on its dedicated service.

Marker: `VOID_OPERATOR_WEBHOOK_RECEIVER_AI_GATEWAY_SOURCE_INTEGRATION_V1`
