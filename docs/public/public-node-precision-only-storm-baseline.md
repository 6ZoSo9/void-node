# Public Node Precision-Only Storm Baseline v1

Marker: `VOID_PUBLIC_NODE_PRECISION_ONLY_STORM_BASELINE_V1`

## Why this exists

Alienware is temporarily offline after a storm.

Until Alienware returns, Precision is the only live truth box for Public Node work. This baseline records the current Precision state without claiming cross-box green.

## Current truth

Precision head:

- commit `931e6c91`
- tag `ckpt-public-node-hide-legacy-intelligence-live-closeout-precision-green-20260612-084242`

Current Public Node behavior:

- Local Data Drop human demo is prioritized on `/public-node`
- weighted local data status remains live
- object browser links are available
- import-your-own-local-data instructions are available
- legacy Data Intelligence card remains hidden until it has live meaning again

## Current Precision-only closeout

Latest closeout:

- marker `VOID_PUBLIC_NODE_HIDE_LEGACY_INTELLIGENCE_LIVE_CLOSEOUT_V1_GREEN`
- commit `931e6c91`
- tag `ckpt-public-node-hide-legacy-intelligence-live-closeout-precision-green-20260612-084242`

## Deferred work

Cross-box confirmation is deferred until Alienware is back online.

When Alienware returns:

1. sync Alienware to Precision `main`
2. verify Alienware reaches commit `931e6c91` or newer
3. rerun the relevant Public Node proofs on Alienware
4. only then record a cross-box closeout

## Rule

Do not describe this lane as cross-box green.

This is Precision-only green.
