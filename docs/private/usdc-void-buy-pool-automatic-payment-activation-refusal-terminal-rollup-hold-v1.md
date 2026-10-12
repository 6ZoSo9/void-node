# USDC/VOID Buy Pool Automatic Payment Activation Refusal Terminal Rollup Hold v1

Marker: `VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_REFUSAL_TERMINAL_ROLLUP_HOLD_V1`

## Purpose

This private operator-only hold records the terminal rollup for the automatic payment activation refusal chain.

It binds the sealed dry-run, non-activation, prerequisite gap, refusal guard, and refusal guard closeout holds into one terminal evidence rollup.

## Bound terminal dependency

`VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ACTIVATION_REFUSAL_GUARD_CLOSEOUT_HOLD_V1`

## Rollup statement

Automatic payment remains refused.

No dry-run artifact, public status artifact, allowlist artifact, preflight artifact, or refusal closeout artifact activates automatic payment.

Activation still requires a separate future explicit operator activation artifact, separate proof stack, two-box green verification, and final Precision sync.

## Boundary

This terminal rollup is evidence-only.

It does not activate:

- automatic payment execution
- real payment approval
- allocation claim creation
- private allocation ledger write
- inventory reserve/decrement
- automatic fulfillment
- wallet fulfillment
- signer access
- treasury transfer authority
- buyer execution
- public mutation
- VOID transfer

## Public exposure

No public route is created by this hold.

No private operator material, activation command, signer material, ledger path, buyer record, allocation record, or execution command is exposed.
