# Authenticated paid-work runtime disabled production install mechanism v1

## Purpose

This mechanism installs the exact sealed paid-work runtime as an immutable,
compiled, disabled-only operator CLI release.

```text
packet_commit=eaa41fdf76044c88eb9c078046bd370acb3ee457
packet_id=voidapwrdp1_64841279f90db042c455ed8bdd3e865cb9a791b224bffc309acae11696bc9784
packet_sha256=3f8e5cf0c29206b172d9f427644b453fa9d1e1d7f7e4ea28bc35fc0060e40de3
runtime_source_commit=3b298bc1e31365aec7a20d03c3f425e22fd2f949
runtime_sha256=3248f5720121d699e5ea4fe34554f7c0ee75ae1f751a8ade7f0a93e3ce72f1b7
```

The mechanism validates the exact packet and checkpoint, compiles the sealed
TypeScript dependency closure in a temporary worktree, runs a disabled smoke
test, and only then permits an installation write after the exact apply
confirmation:

`installAuthenticatedPaidWorkRuntimeDisabledProductionV1`

## Installed layout

The canonical production root is:

`~/.local/share/void-authenticated-paid-work-runtime-disabled-v1`

Each release is immutable under `releases/`, and `current` is updated
atomically. The release contains compiled JavaScript, a disabled configuration,
a disabled-only launcher, checksums, and an installation manifest.

No service unit is created. No service is restarted. No HTTP route or network
listener is registered. No enable configuration is written, and the production
persistence root is not created.

## Activation boundary

`ready_for_activation=false` remains binding. The installed launcher passes an
explicit disabled configuration and intentionally absent command and trusted
context paths. A successful smoke result must prove that no trusted context is
loaded, no store is inspected, no persistence is attempted, and no authority is
granted.

Payment execution and work execution remain separate future authority gates.

## Proof boundary

The focused proof performs apply operations only beneath a temporary `/tmp`
root. It proves confirmation-before-write, deterministic planning, immutable
release construction, exact permissions, disabled smoke behavior, idempotent
reinstallation, packet-tamper refusal, and zero service/network/payment
authority. It does not perform a production install.
