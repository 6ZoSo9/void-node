# Buy VOID coupled launch gate v1

Marker: `VOID_BUY_COUPLED_LAUNCH_GATE_V1_GREEN`

## Purpose

Restore the source-side prerequisite that keeps public Buy VOID request intake
coupled to the production WC/VOID opening gate.

This additive module does not mount a public route and does not activate
anything. The later `src/index.ts` integration remains separate while #2374
owns that file.

## Canonical inputs

The gate reads exactly:

- `ops/mainnet0/wc-void-production-candidate-v1.json`;
- `ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json`;
- `ops/mainnet0/economic-evm-successor-migration-candidate-v1.json`.

The coupled launch ID is:

`sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26`

The gate is ready only when the production WC/VOID candidate, coupled successor
gate, inventory/custody/canary conditions, all coupled source gates, and
source-only successor authority are mutually consistent.

Current canonical source is intentionally HOLD, so restoring this module cannot
open Buy VOID intake.

## Integration boundary

After #2374 clears `src/index.ts`, the public checkout may compose this source
gate by requiring both the explicit Buy intake toggle and `launch.ready`.

That future integration must continue to expose the coupled launch ID/readiness
and must not treat this gate as Ethereum verifier/finality authority. #2393/#2396
remain separate prerequisites for Ethereum public intake.

## Authority

Source/proof only:

- no request-intake activation;
- no runtime/config mutation;
- no wallet, signer, credential, or private-key access;
- no payment or transaction action;
- no inventory reservation or funding;
- no presale/WC market activation;
- no liquidity, treasury, token, or funds movement.

## Verification

```bash
node scripts/prove_void_buy_coupled_launch_gate_v1.mjs
```
