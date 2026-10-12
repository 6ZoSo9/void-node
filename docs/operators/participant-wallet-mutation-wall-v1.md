# Participant wallet mutation wall v1

Marker: `VOID_PARTICIPANT_WALLET_MUTATION_WALL_V1`

Status: source-only fail-closed hardening.

## Purpose

The node still imports `src/http/participant_wallet_native_v1.ts` because its
read-only wallet-status projection feeds the local participant UI.

That module historically also mounted mutation routes for:

- wallet creation/import/unlock/export;
- direct `VoidToken` transfer; and
- WC -> VOID trading through the development WC relayer.

Those mutation paths are not compatible with the current production economic
boundary. Public wallet/signer mutation is not enabled, the fixed-rate/dev
WC-relayer lane is retired, and production WC/VOID remains separately gated.

## V1 behavior

All raw participant-wallet routes are loopback-only.

The source fixes:

```text
WALLET_MUTATION_ENABLED_V1=false
```

The following routes remain named for compatibility but fail closed while that
constant is false:

```text
POST /__void/participant/wallet/create
POST /__void/participant/wallet/import
POST /__void/participant/wallet/unlock
POST /__void/participant/wallet/lock
GET  /__void/participant/wallet/export
POST /__void/participant/wallet/send-void
```

No environment variable or request field can turn mutation back on.

The historical route:

```text
POST /__void/participant/wallet/trade/wc-to-void
```

is permanently retired in this generation and returns a fail-closed retirement
response. It cannot call `ops/wc-relayer-v1.cjs`, cannot use a fixed-rate
fallback, and cannot submit a production WC/VOID trade.

## Token identity

The dormant direct-send helper no longer discovers `VoidToken` from the old WC
relayer health endpoint. It binds the canonical Mainnet-0 token address:

```text
0x470075b85352eb86f7d089fb9ba88945f12aad94
```

This does not authorize a transfer. The send route remains disabled.

The dormant helper also parses token amounts with exact 18-decimal integer
conversion rather than `Number(...)` and floating-point multiplication.

## Security boundary

This lane does not claim that the legacy encrypted-keystore implementation is
ready for production wallet custody. It deliberately makes that question
unreachable from the mounted route surface.

A future participant-wallet mutation design must receive its own review for:

- private-key custody and memory lifetime;
- keystore path, mode, symlink, overwrite, and atomic-write safety;
- authentication/session authorization;
- CSRF/origin policy;
- exact token/native-gas distinction;
- nonce reservation and pending-transaction recovery;
- transaction simulation, fee limits, receipts, and finality;
- public versus loopback exposure; and
- independent wallet/export/recovery behavior.

## Authority

Merging this source does not create or import a wallet, read a private key,
unlock a wallet, sign or broadcast a transaction, trade WC, move `VoidToken`,
alter Chain-2050, start/restart a service, or move funds.
