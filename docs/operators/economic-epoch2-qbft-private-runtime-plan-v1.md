# Epoch-2 private QBFT runtime plan v1

Marker: `VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_PLAN_V1`

Status: source-only private runtime plan compiler; activation remains HOLD.

## Purpose

Turn one fresh green
`VOID_ECONOMIC_EPOCH2_QBFT_LIVE_TOPOLOGY_PREFLIGHT_V1` receipt into a
content-addressed private three-validator Besu runtime plan without publishing
the live operator tailnet addresses into the repository.

The generated plan is intentionally written outside source control and mode
0600. It contains the live tailnet addresses and derived enodes needed for the
future private validator runtime.

## Bound production identity

The compiler fixes:

- Chain ID 2050;
- execution epoch 2;
- Besu 26.8.1 image digest already used by the Epoch-2 equivalence lanes;
- the exact raw-transaction-domain plugin SHA-256;
- the exact reviewed Epoch-2 genesis SHA-256;
- the exact three Besu validator public identities;
- QBFT validator count 3 and quorum 2;
- P2P port 30313; and
- Precision-only loopback RPC port 18553.

The topology receipt must remain green, fresh, clean-main aligned, and descended
from the receipt's exact observed source head.

## Private networking

Each validator uses the current tailnet IPv4 from the private topology receipt
as its advertised P2P address. Those addresses are never embedded in repository
source.

The generated per-host plan uses:

- P2P enabled;
- discovery disabled;
- an explicit Besu `--static-nodes-file`;
- exactly the other two validators as static peers;
- maximum two peers;
- one peer minimum for synchronization; and
- Docker host publication only on that host's observed tailnet IPv4 and TCP
  port 30313.

Besu 26.8.1 release source commit
`d97cbd61976a52bb109e637196fef9a8ebf2b617` provides the reviewed
`--static-nodes-file`, `--p2p-host`, `--p2p-interface`, and
`--p2p-port` CLI surfaces used by the plan.

## RPC boundary

Only Precision receives an RPC publication:

`http://127.0.0.1:18553/`

It is loopback-only and limited to `ETH,NET,WEB3,QBFT`. Nimo and Xiphos
remain RPC-disabled.

This is not a public raw-RPC surface.

## Genesis and plugin

Every host must independently rebuild the same reviewed genesis through
`tools/void-economic-epoch2-besu-genesis-builder-v1.mjs` and verify exact
SHA-256 before runtime materialization.

The raw-transaction-domain plugin must also be revalidated against the exact
content hash before any validator is started.

## Authority boundary

This lane only compiles a plan. It does not:

- install or start a service;
- create a P2P or RPC listener;
- run or mutate Docker;
- read any validator private-key bytes;
- construct, sign, submit, or broadcast a transaction;
- create authoritative Chain-2050 blocks;
- mutate validators;
- move tokens or funds;
- authorize migration; or
- authorize public activation.

Starting the three-validator QBFT network is a separate explicit operator action
because it begins authoritative successor-chain block production.

## Precision plan generation

After a fresh green topology preflight:

```bash
node ops/precision/void-precision-epoch2-qbft-private-runtime-plan-v1.mjs \
  "$HOME/Downloads/void_epoch2_qbft_live_topology_preflight_v1_<stamp>.json" \
  "$HOME/Downloads/void_epoch2_qbft_private_runtime_plan_v1_<stamp>.json"
```

The topology receipt must be no older than one hour.
