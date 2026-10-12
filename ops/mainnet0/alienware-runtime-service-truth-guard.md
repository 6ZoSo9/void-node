# Alienware Runtime Service Truth Guard

artifact: VOID_ALIENWARE_RUNTIME_SERVICE_TRUTH_GUARD_V1
result: guard_ready

Status: retired historical evidence
Current authority: none
Live service recheck: prohibited

Alienware is permanently retired and is not part of the active operator fleet.
This document preserves the service-selection history that closed an old
DataNet cross-box incident. It does not describe current runtime truth and must
not be used to infer the service state of Precision, Nimo, or Xiphos.

## Historical runtime truth

At the recorded Alienware checkpoint, the intended VOID user service was:

`void-node-live.service`

The duplicate legacy service was:

`void-node.service`

## Why this guard existed

During the DataNet Store & Serve cross-box lane, Alienware repeatedly failed with
port collisions on 4100 and 4700 because scripts restarted `void-node.service`
while `void-node-live.service` already owned the live runtime ports.

The active process at that historical checkpoint was proven to be under:

`app.slice/void-node-live.service`

The duplicate `void-node.service` path was therefore not valid for that
Alienware runtime.

## Historical proof behavior

The Store & Serve proof supported:

`VOID_RUNTIME_SERVICE=void-node-live.service`

and carried marker:

`VOID_RUNTIME_SERVICE_GUARD_V1`

Those facts remain historical evidence. They do not authorize a current service
restart or service selection on any active machine.

## Historical safe-runtime note

Alienware `void-node-live.service` used the safe-runtime drop-in:

`~/.config/systemd/user/void-node-live.service.d/96-public-safe-runtime-live.conf`

This is retained only to explain the historical runtime configuration.

## Retired live-check boundary

The proof script is static/history-only. A nonzero `LIVE_SERVICE_CHECK` must
fail closed with:

`VOID_RETIRED_ALIENWARE_LIVE_SERVICE_CHECK_HOLD_V1`

before any `systemctl`, `curl`, restart, service-state observation, or local
runtime inference is attempted.

## Historical closed lane

DataNet Store & Serve closeout:

`VOID_DATANET_STORE_SERVE_LIVE_SERVICE_CROSSBOX_CLOSEOUT_GREEN`

Closeout commit:

`af8f3731`

Closeout tag:

`ckpt-datanet-store-serve-live-service-crossbox-closeout-green-20260607-205029`
