# Public Node Proof Mode Status Card Closeout v1

Marker: `VOID_PUBLIC_NODE_PROOF_MODE_STATUS_CARD_CLOSEOUT_V1`

## What closed

The Public Node page now exposes a human-visible Proof Mode Status card.

The card tells testers the current truth:

- Precision-only green
- Alienware deferred
- cross-box pending

This prevents the Public Node page from implying cross-box confirmation while Alienware is offline after the storm.

## UI surface

The Public Node page includes:

- card id `publicNodeProofModeStatusCard`
- marker `VOID_PUBLIC_NODE_PROOF_MODE_STATUS_UI_V1`
- text `Precision-only green`
- text `Alienware is temporarily offline after a storm`
- text `Precision-only green / Alienware deferred / cross-box pending`

The card appears before the Local Data Drop human demo card so the proof mode is visible before the tester sees the demo.

## Checkpoints

Source repair checkpoint:

- commit `9f3a5ca9`
- tag `ckpt-public-node-proof-mode-status-card-source-repair-green-20260612-134730`
- marker `VOID_PUBLIC_NODE_PROOF_MODE_STATUS_CARD_SOURCE_V1_GREEN`

Live checkpoint:

- commit `ee6b9d60`
- tag `ckpt-public-node-proof-mode-status-card-live-green-20260612-134907`
- marker `VOID_PUBLIC_NODE_PROOF_MODE_STATUS_CARD_LIVE_V1_GREEN`

## Bad tag cleanup

The earlier misleading source tag was deleted because the source patch failed before the proof-only commit:

- deleted tag `ckpt-public-node-proof-mode-status-card-source-green-20260612-085236`

## Current rule

This lane is Precision-only green.

Do not claim cross-box green until Alienware returns, syncs, and reruns the Public Node proof stack.
