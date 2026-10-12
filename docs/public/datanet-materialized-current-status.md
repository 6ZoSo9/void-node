# VOID DataNet Materialized Public Status

Marker: `VOID_DATANET_MATERIALIZED_PUBLIC_STATUS_V1`

## Status

DataNet materialization is currently proven across the two-box Mainnet-0 operator baseline.

- Current baseline doc: `docs/public/datanet-materialized-current-baseline.md`
- Current baseline proof: `datanet-materialized-current-baseline-proof`
- Current baseline checkpoint: `ckpt-datanet-materialized-current-baseline-v1-green-20260605-155821`
- Current main head: `8e6eb939`
- Prior stack sweep checkpoint: `ckpt-no-manual-peer-seed-tailscale-preflight-guard-v1-green-20260605-154722`
- Prior stack sweep head: `7bb86976`
- Sweep closeout log: `/tmp/materialized-stack-after-tailscale-preflight-guard-sweep-closeout-20260605-155537.log`
- Baseline closeout log: `/tmp/datanet-materialized-current-baseline-v1-crossbox-closeout-20260605-155849.log`

## What is proven

- Tailscale SSH auth preflight guard runs before no-manual-peer-seed share/open.
- No-manual-peer-seed share/open is green both ways.
- Local materialized persistence is green.
- Restart persistence is green.
- Copy integrity is green.
- Materialized provenance is green.
- Participant viewer provenance status card is green.
- Mainnet-0 status smoke is green.
- Mainnet-0 cross-box status smoke is green.

## Runtime truth

- `ready=true`
- `head=1856587`
- `gap=0`
- `txroot_live=1`

## Safety invariants

This public status surface is docs/proof-only. It does not move value or mutate consensus.

- `buy_void_fulfillment=false`
- `validator_mutation=false`
- `wallet_send=false`
- `wc_to_void_swap=false`
