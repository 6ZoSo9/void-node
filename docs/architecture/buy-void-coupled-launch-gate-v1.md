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
successor migration are mutually consistent.

The gate requires exact reviewed key sets for:
- production authority;
- coupled source gates;
- coupled authority; and
- successor launch authority.

Missing or extra authority/gate keys fail closed even when every remaining value
has the expected boolean. The successor candidate must also pass
`classifyVoidEconomicEvmSuccessorMigrationV1(...)` with `ok=true` and
`status=SOURCE_READY`; shape-valid source-only authority is not enough.

Current canonical successor classification is intentionally `HOLD` because the
public state-root anchor and public economic verification path are not both ready,
so restoring this module cannot open Buy VOID intake.

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

The proof also:
- demonstrates that synthetically ready production/coupled candidates remain HOLD
  against the current canonical successor;
- constructs a fully classifier-ready successor only for inert proof purposes;
- removes and adds gate/authority keys and requires fail-closed behavior; and
- proves missing successor public-verification gates prevent readiness.
