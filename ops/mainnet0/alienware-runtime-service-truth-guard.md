# Alienware Runtime Service Truth Guard

artifact: VOID_ALIENWARE_RUNTIME_SERVICE_TRUTH_GUARD_V1
result: guard_ready

## Runtime truth

Alienware's live VOID runtime is:

void-node-live.service

The duplicate legacy service is:

void-node.service

## Why this guard exists

During the DataNet Store & Serve cross-box lane, Alienware repeatedly failed with port collisions on 4100 and 4700 because scripts restarted `void-node.service` while `void-node-live.service` already owned the live runtime ports.

The active process was proven to be under:

app.slice/void-node-live.service

The duplicate `void-node.service` path must not be used for Alienware live proofs unless it has been intentionally cleaned up or disabled first.

## Required proof behavior

Store & Serve and future live runtime proofs must support:

VOID_RUNTIME_SERVICE=void-node-live.service

They must not blindly restart:

void-node.service

The Store & Serve proof now includes:

VOID_RUNTIME_SERVICE_GUARD_V1

## Safe-runtime note

Alienware `void-node-live.service` requires the safe-runtime drop-in:

~/.config/systemd/user/void-node-live.service.d/96-public-safe-runtime-live.conf

This drop-in keeps the live service responsive by disabling wrapper/hot-loop families.

## Current closed lane

DataNet Store & Serve closeout:

VOID_DATANET_STORE_SERVE_LIVE_SERVICE_CROSSBOX_CLOSEOUT_GREEN

Closeout commit:

af8f3731

Closeout tag:

ckpt-datanet-store-serve-live-service-crossbox-closeout-green-20260607-205029
