# WC/VOID coupled launch policy bundle v1

Marker: `VOID_WC_VOID_COUPLED_LAUNCH_POLICY_BUNDLE_V1`

Status: source-only launch-policy compiler. It does not choose production policy
values, read a wall clock, mutate runtime state, enable Buy VOID, activate
WC/VOID or the presale, access a wallet/signer/key, submit a transaction, or move
funds.

## Purpose

Several coupled economic policies are already source-ready but deliberately do
not hardcode their production values.

A real launch still needs one reviewed, immutable policy object that commits the
exact values before opening.

This bundle composes five existing policy families without replacing them:

1. absolute WC/VOID opening window;
2. participant and related-identity concentration caps;
3. minimum real production-earned WC depth;
4. economic-intent TTL and outstanding-count caps; and
5. sponsored execution gas budgets.

The result is one content-addressed launch-policy bundle.

The bundle is bound to the canonical coupled-launch identity currently recorded
by `ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json`:

```text
sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26
```

A policy bundle for any other launch ID fails closed. The CI workflow tracks the
canonical candidate path so a reviewed launch-identity change forces this
compiler to be reconsidered.

## No source-selected defaults

The compiler has no default launch values.

The caller must explicitly supply every production value.

The source proof uses synthetic fixture values only to exercise the verifier.
Those numbers are not recommendations, launch settings, or policy authority.

The compiled artifact records:

```text
exact_values_supplied_explicitly=true
values_selected_by_source=false
runtime_enforcement_verified=false
launch_authority=false
market_activation_authorized=false
public_presale_activation_authorized=false
funds_movement_authorized=false
```

## Opening window

The supplied opening window must use the canonical
`VOID_WC_VOID_OPENING_WINDOW_SCHEMA_V1`.

It binds:

- one exact coupled launch ID;
- policy commitment time;
- absolute open time;
- absolute exclusive close time; and
- deterministic content-addressed window ID.

Required ordering:

```text
window policy committed < opens < closes
```

The compiler reads no wall clock.

## Concentration and Sybil caps

The supplied concentration policy must:

- bind the same coupled launch ID;
- bind the exact opening-window ID;
- be committed after the window policy and before opening;
- use positive basis-point caps strictly below 10000;
- require related-identity cap >= individual participant cap;
- use the canonical fail-closed action; and
- reproduce the canonical policy ID exactly.

The compiler does not select either cap.

## Minimum real-WC depth

The minimum-depth policy must:

- bind the same launch and opening window;
- be committed before opening;
- use a positive whole-WC minimum;
- use the canonical hold-opening-price failure action; and
- reproduce its canonical policy ID.

The compiler does not select the WC threshold.

## TTL and outstanding caps

The economic-intent policy must:

- bind the same coupled launch;
- be committed before opening;
- use a positive TTL no greater than the existing 300-second signed-submission
  ceiling;
- use positive per-identity and global outstanding limits;
- require global >= per-identity;
- stay inside the existing one-million tracked-intent technical ceiling;
- preserve `reconcile_without_automatic_execution` for late payments; and
- reproduce the canonical policy ID.

The compiler does not select the TTL or either cap.

## Sponsored execution budgets

The sponsored-execution policy must:

- bind the same coupled launch;
- bind the exact TTL/caps policy ID;
- be committed after the TTL policy and before opening;
- use a positive per-intent gas limit no greater than the existing 3,000,000
  signed-intent ceiling;
- satisfy:

```text
per-intent <= per-identity <= global
```

- preserve
  `deny_sponsorship_without_hidden_trade_minimum`; and
- reproduce the canonical policy ID.

Budget exhaustion therefore denies sponsorship rather than silently creating a
purchase/trade-size minimum.

The compiler does not select any gas budget.

## Bundle commitment ordering

The bundle itself is committed only after every dependency policy exists and
still before opening:

```text
latest dependency policy commitment
  <= bundle commitment
  < opening time
```

All five policy objects and their content-addressed IDs are embedded in the
bundle, together with the four canonical source policy-contract IDs.

The resulting bundle ID is:

```text
sha256:<canonical bundle body>
```

## Private artifact custody

CLI input and output must be outside the repository.

The input must be:

- an absolute direct regular file;
- owner-controlled;
- private against group/other access; and
- no larger than 1 MiB.

The output parent must be a direct, non-symlink, owner-controlled directory that
is not group/other writable.

The output is create-only, mode `0600`, fsynced, and never overwritten.

## CLI

After the operator has independently reviewed every explicit value:

```bash
node tools/void-wc-void-coupled-launch-policy-bundle-v1.mjs \
  --input /absolute/private/launch-policy-input.json \
  --output /absolute/private/launch-policy-bundle.json
```

A green bundle is still policy preparation only. Runtime enforcement, final
opening-cohort observations, final coupled source promotion, Buy VOID process
gates, and the launch ceremony remain separate gates.

## Authority boundary

The bundle does not perform or authorize:

- wall-clock observation;
- runtime or service mutation;
- WC-ledger writes;
- wallet/signer/private-key access;
- transaction construction/signing/submission/broadcast;
- Chain-2050 writes;
- inventory funding or liquidity movement;
- market activation;
- public presale activation; or
- funds movement.

## Verification

```bash
node scripts/prove_void_wc_void_coupled_launch_policy_bundle_v1.mjs
```
