# Public Node Local Data Drop Live Import Runbook v1

Marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_RUNBOOK_V1`

## Purpose

This runbook defines how to intentionally import operator-local files into the live Public Node runtime.

Live import is different from scratch import.

Scratch import proves behavior without changing the public node.

Live import intentionally changes what `/public-node/local-data-drop/weighted.json` serves.

## Current live baseline

Before live import, the current Precision Public Node baseline is:

- `object_count=1`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1`
- proof mode `Precision-only green / Alienware deferred / cross-box pending`

## Rule

Do not run live import casually.

A live import is a public surface mutation.

It may require updating proofs that currently expect `object_count=1`.

## Preflight

Before live import:

1. confirm `git status --short` is clean
2. record current `git rev-parse --short HEAD`
3. record current `/public-node/local-data-drop/weighted.json` object count
4. prepare the source directory
5. decide the expected new object count
6. accept that existing one-object proofs may need updates

## Live import command shape

Use the node runtime data directory, not a scratch directory:

    DATA_DIR="$HOME/dev/void-node/.runtime/mainnet0" \
      ops/mainnet0/public-node-local-data-drop-import-dir.sh /path/to/source-dir

## After import

After live import:

1. restart `void-node.service`
2. verify `/__void/ready.json`
3. verify `/public-node/local-data-drop/weighted.json`
4. confirm expected `object_count`
5. verify object id fetch paths
6. verify SHA-256 fetch paths
7. update proofs that intentionally expect the old count
8. commit and tag the new live state

## Current recommendation

While Alienware is offline, prefer scratch import proofs unless the goal is explicitly to mutate the Precision public surface.

Do not claim cross-box green until Alienware returns and reruns the Public Node proof stack.
