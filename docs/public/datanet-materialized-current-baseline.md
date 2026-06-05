# VOID DataNet Materialized Current Baseline

Marker: `VOID_DATANET_MATERIALIZED_CURRENT_BASELINE_V1`

## Current checkpoint

This document records the current DataNet materialization baseline after the Tailscale SSH auth preflight guard and full upstream materialized-stack regression sweep.

- Current main head: `7bb86976`
- Current checkpoint tag: `ckpt-no-manual-peer-seed-tailscale-preflight-guard-v1-green-20260605-154722`
- Sweep closeout log: `/tmp/materialized-stack-after-tailscale-preflight-guard-sweep-closeout-20260605-155537.log`
- Sweep output directory: `/tmp/materialized-stack-after-tailscale-preflight-guard-sweep-20260605-155200`

## Runtime truth at closeout

- `ready=true`
- `head=1856587`
- `gap=0`
- `txroot_live=1`
- Precision and Alienware were aligned on the same checkpoint.

## Green sweep lanes

- `build_rc=0`
- `tailscale_preflight_rc=0`
- `no_manual_peer_seed_rc=0`
- `materialized_local_persistence_rc=0`
- `materialized_restart_persistence_rc=0`
- `materialized_copy_integrity_rc=0`
- `materialized_provenance_rc=0`
- `materialized_provenance_status_view_rc=0`
- `status_smoke_rc=0`
- `crossbox_status_smoke_rc=0`

## Functional baseline

- `tailscale_preflight_guard_exercised=true`
- `hidden_tailscale_auth_hang_prevented=true`
- `viewer_provenance_status_proof_still_green=true`
- `materialized_copy_integrity_still_green=true`
- `restart_persistence_still_green=true`

## What this baseline means

The DataNet materialized share/open path is currently proven across both boxes from the low-level no-manual-peer-seed flow through local persistence, restart persistence, copy integrity, provenance, and the participant viewer provenance status card.

The earlier proof stalls were diagnosed as a Tailscale SSH re-auth gate, not a VOID proof failure. The auth-sensitive proof path is now guarded by a BatchMode Tailscale SSH auth preflight so future failures should fail fast instead of silently hanging inside a nested two-box proof.

## Safety invariants

This baseline is docs/proof-only. It did not perform value-moving actions.

- `buy_void_fulfillment=false`
- `validator_mutation=false`
- `wallet_send=false`
- `wc_to_void_swap=false`
