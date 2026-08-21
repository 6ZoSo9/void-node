# Buy VOID ERC-20 disabled dependency injection v1

This gate composes the already-reviewed ERC-20 signer, broadcaster, and
submission-guard dependencies into the canonical delivery runtime **without
enabling delivery execution**.

## Canonical production credential evidence

The one-shot production proof on the canonical Precision/Mainnet-0 operator
derived the fixed systemd credential `buy-void-native-fulfillment-wallet-v1` to:

`0xc884f631c3881b8b672bfcbf019c856146cd7f73`

Wallet-address fingerprint:

`68dd42774ebc792bb79b509ec651a9d560005d9ac0a54f7b50ce2e288ee3e498`

The checked-in evidence is deliberately redacted and deployment-scoped. It
does not contain the credential path or private key, does not claim that an
arbitrary clone has the same credential, and does not authorize reuse of the
credential outside the canonical production operator.

Evidence content ID:

`20b5201b7d0516b3a4eb538fa4ec8fc1d1c68d5d1158740a11992025a2451495`

The content ID is an integrity identifier, not a signature.

## Dormant dependency injection

Source adds an injection seam guarded by all of these fail-closed conditions:

- `VOID_BUY_VOID_ERC20_DELIVERY_DEPENDENCY_INJECTION_ENABLED=1`;
- `VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_ENABLED=0` exactly;
- `VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID=20b5201b7d0516b3a4eb538fa4ec8fc1d1c68d5d1158740a11992025a2451495`;
- `VOID_BUY_VOID_DELIVERY_WALLET_ADDRESS` must equal the wallet derived by the
  canonical credential-binding evidence.

If delivery is enabled, the delivery enable value is absent/nonzero, the
evidence ID differs, or the configured wallet differs from the evidence-bound
wallet, no dependency global is populated.

When every dormant-injection condition is satisfied, the bootstrap validates
the server-controlled policy and places the signer/broadcaster dependencies in
`__void_buy_void_delivery_runtime_dependencies_v1`. Bootstrap construction does
not read the credential, call RPC, sign, broadcast, or write the submission
guard.

This v1 injector is intentionally a **disabled staging gate**, not the later
activation mechanism. A process started with delivery enable `1` will refuse
dependency injection. Enabling delivery therefore requires a later separately
reviewed/authorized activation design rather than merely flipping this staging
flag. With delivery exact `0`, dependency injection grants no effective RPC,
signing, broadcast, or money authority.

## Readiness truth boundary

The canonical presale economics layer now enforces a single `buy-void-presale-v1` pool capped at 10000000 VOID (10000000000000 six-decimal fulfillment units) and the fixed `2 VOID / 1 USDC` rate. The reservation ceiling equals the total pool, so buyers are not throttled to the disabled delivery canary. A 10,000 VOID validator-scale reservation is part of the acceptance wall.

The existing 2-VOID value belongs only to disabled delivery-execution staging. It is deliberately allowed while delivery remains `0`, but public delivery activation must use a delivery maximum equal to the canonical presale capacity. Runtime activation, inventory funding, and any value-bearing transaction remain later gates.

## Authority boundary

This source lane performs no production environment mutation, restart,
credential read, wallet access, RPC, signing, broadcast, submission-guard
write, inventory funding, treasury/liquidity action, or funds movement.

A later disabled production injection/restart is a separate explicit operator
authorization. Delivery `enable=1`, inventory funding, and any transaction are
later independent gates.
