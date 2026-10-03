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

The gate is ready only when the canonical coupled-launch classifier is
`SOURCE_READY`, the exact reviewed coupled launch ID matches, and the production
candidate's deployment/custody evidence plus the coupled policy bundle's
runtime/launch evidence are all production-ready. Canonical source-mechanism
readiness by itself is necessary but not sufficient for public request intake.

The gate requires exact reviewed key sets for:
- production authority;
- coupled source gates;
- coupled authority; and
- successor launch authority.

Missing or extra authority/gate keys fail closed through
`classifyVoidWcVoidCoupledLaunchReadinessV1(...)`. Public intake also requires
the nested launch facts that source classification intentionally does not
promote on its own: deployed vault/runtime attestations, live WC ledger/custody
evidence, selected production caps/minimum depth/TTL/budgets, reverse-settlement
verification, related-identity truth, and shared post-discovery launch evidence.
A top-level boolean promotion cannot bypass those nested HOLD facts.

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
- demonstrates that synthetically source-ready production/coupled candidates
  remain closed against the current canonical successor;
- proves that even a canonical `SOURCE_READY` composition cannot open intake
  while nested deployment/runtime/launch evidence remains false;
- proves canonical classifier drift checks for production/coupled invariants;
- removes and adds gate/authority keys and requires fail-closed behavior; and
- proves missing successor public-verification gates prevent readiness.
