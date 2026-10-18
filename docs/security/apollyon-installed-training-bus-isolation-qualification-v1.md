# Installed Apollyon training bus-isolation qualification v1

Marker: `VOID_APOLLYON_INSTALLED_TRAINING_BUS_ISOLATION_QUALIFICATION_V1`

Status: **observer-only compatibility gate. Standalone V1 service lifecycle execution is retired; use V2 for any standalone qualification.**

## Purpose

This is the canonical successor named by the merged training-isolation source and
pre-entry binary-lock lanes. It closes the distinction between reviewed source,
installed bytes and live enforcement.

A successful `--observe-live-pid <pid>` receipt requires all of the
following at the same designated host boundary:

- exact reviewed systemd unit bytes;
- exact locked 17,352-byte native pre-entry ELF;
- exact locked 17,384-byte inert training-entrypoint ELF;
- dedicated `voidapollyontrain` UID/GID;
- the service already loaded and active with `MainPID` equal to the supplied
  observed PID;
- that PID already executing the exact reviewed training entrypoint;
- all real/effective/saved/fs UID and GID slots equal the dedicated identity;
- `NoNewPrivs=1`;
- inherited, permitted, effective, bounding and ambient capability sets all zero;
- no inherited descriptor at fd 3 or above;
- the process living in the expected system service cgroup;
- the current Linux boot ID, bound as SHA-256; and
- the live process start-time ticks from /proc/<pid>/stat field 22.

The observer does not start the service, require an initially inactive state, or
wait through the executor-to-entrypoint transition. Those lifecycle actions and
transition timing belong to the current V2 lifecycle owner.

Standalone `--live-qualify` is retained only as an explicit fail-closed
compatibility flag. It immediately returns
`HOLD=standalone_live_qualify_retired_use_v2` before any systemd query,
start, stop, or service mutation. V1 is therefore no longer a lifecycle owner.

For downstream same-process composition, `--observe-live-pid <pid>` performs
the same identity/isolation checks against an already-active exact MainPID but
does not start, stop, restart or enable the service. Its receipt records
`service_action_performed=false` and `service_active_after_observation=true`.
That allows the later V2 composer to collect custody evidence while the exact
same PID/start-tick generation is still alive.

The boot-ID digest plus PID plus process start-time ticks form the downstream
generation binding. A later V2 composer must require all three to equal the
training-process generation in its custody evidence; this receipt cannot be
reused for a different start of the same unit.

## Why exact entrypoint observation matters

On current Xiphos systemd, `MainPID` may briefly identify
`/usr/lib/systemd/systemd-executor` with root credentials before the configured
credential transition and final `execve()`. Sampling that transient process is
not evidence about Apollyon.

The V1 observer therefore accepts only a PID whose `/proc/<pid>/exe` is already
the exact reviewed entrypoint; it does not perform or wait through that
transition itself. The V2 lifecycle owner is responsible for waiting for the
reviewed entrypoint before invoking the V1 observer.

## Authority boundary

The installed entrypoint is intentionally inert and ends at the durable-claim
HOLD. This qualifier contains no trainer, model-loading, corpus mutation,
candidate-weight mutation, attempt-claim writer, key/signing, wallet,
transaction or funds logic.

The unchanged `--observe-live-pid` receipt reports:

```text
training_execution=false
attempt_claim=false
candidate_weight_mutation=false
service_action_performed=false
service_enabled=false
service_active_after_observation=true
```

The next source gate is a versioned preclaim successor that must compose this
receipt with the current V2 custody generation. Historical V84/V1 evidence alone
must not satisfy that successor.

## Modes

`--self-test` is inert and is what hosted CI executes.

`--live-qualify` is retired. It performs no host or service action and
fails closed with `standalone_live_qualify_retired_use_v2`. V2 owns all
future standalone start/stop qualification.

`--observe-live-pid <pid>` is the composition mode. It requires an already
active exact service MainPID and performs no service action. The later V2
composer must own that service lifecycle and bind its custody evidence to the
receipt's boot-ID digest, PID and process start-time ticks before any preclaim
result may be emitted.

V1 performs no service action in either supported outcome: the retired
standalone flag HOLDs, while `--observe-live-pid` remains read/observe-only.


## Compatibility invariant

This retirement intentionally changes the V1 source Git blob while preserving
the observer contract. Hosted proof compares the exact AST of
`observe_live_generation`, `verify_installed_materials`, and the canonical
receipt serializer against parent generation
`e64049c3f460eae077364567f63aa3298ecf9c31`.

Any downstream contract that records the full V1 source blob must migrate that
provenance pin explicitly. Receipt fields and qualification-ID derivation for
the observer path are not silently rewritten by this gate.
