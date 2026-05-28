# DataNet Site Bundle Seeding Runbook

Status: Mainnet-0 public-live operational runbook

Scope: VOID native public site bundle routes and DataNet-backed site serving

## Why this exists

VOID public site routes are DataNet-first with repo static fallback.

The route may still return HTTP 200 from repo fallback even when the local DataNet packed bundle is missing. That is useful for bootstrap availability, but it is not the same as proving DataNet-backed serving.

Until peer materialization for site bundles is automated, follower nodes must have the packed DataNet site bundles seeded locally before the public site bundle proof is expected to pass.

## Current public site bundle datasets

Voidchain:

- dataset_id: 3280ff66058b5429872a7e41a4b5c21d
- content_root: ec877b747894d093e4ffd4ab9ad8e83c0c43729efb9e002806287e4cfb4296a1
- route: /site/voidchain
- aliases: /download, /voidchain

NullFeed:

- dataset_id: 6a24c375872459c0f9941c58e88bd61e
- content_root: f4c8b03bb8f5dae627bb6df9eddab48060bc0dab1a8c886d56dbeab2b4b0c372
- route: /site/nullfeed
- alias: /nullfeed

## Required local path

Each node that should serve the public site bundle from DataNet must have packed bundles under:

    data_a/datanet/publish_shim_v1/packed/<dataset_id>/

Each packed bundle should include at least:

    root.txt
    manifest.v1.json
    chunk_000000.bin
    meta.publish_shim.v1.json

## Seeding follower nodes

Example from Precision to Alienware:

    cd "$HOME/dev/void-node" || exit 1

    ALIEN="zoso@100.122.79.39"

    VOIDCHAIN_DS="3280ff66058b5429872a7e41a4b5c21d"
    NULLFEED_DS="6a24c375872459c0f9941c58e88bd61e"

    ssh -n "$ALIEN" 'mkdir -p /home/zoso/dev/void-node/data_a/datanet/publish_shim_v1/packed'

    rsync -a --delete \
      "data_a/datanet/publish_shim_v1/packed/$VOIDCHAIN_DS" \
      "data_a/datanet/publish_shim_v1/packed/$NULLFEED_DS" \
      "$ALIEN:/home/zoso/dev/void-node/data_a/datanet/publish_shim_v1/packed/"

After copying, restart the follower node:

    ssh -n "$ALIEN" 'cd /home/zoso/dev/void-node && systemctl --user restart void-node.service && sleep 5 && curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json && echo'

Then run:

    ssh -n "$ALIEN" 'cd /home/zoso/dev/void-node && make void-public-site-bundle-proof'

## Expected failure when bundles are missing

If bundles are missing, /site/voidchain or /site/nullfeed may still return HTTP 200 but with headers like:

    x-void-site-source: repo_static_fallback_v1
    x-void-datanet-backed: false
    x-void-site-fallback-reason: missing_datanet_chunk

That is not acceptable for the DataNet-backed public site bundle proof.

Expected passing headers include:

    x-void-site-source: datanet_live_v1
    x-void-datanet-backed: true

## Guardrail

Do not treat repo static fallback as DataNet-backed serving. The public site bundle proof must require DataNet-backed headers and the expected content roots.

This runbook is temporary operational glue until peer materialization can automatically fetch and materialize required site bundles on follower nodes.
