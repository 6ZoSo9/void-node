# Installed Apollyon training bus-isolation qualification v1

Marker: `VOID_APOLLYON_INSTALLED_TRAINING_BUS_ISOLATION_QUALIFICATION_V1`

Status: **source-only operator qualification gate; live execution requires a separate explicit invocation on Xiphos**.

## Purpose

This is the canonical successor named by the merged training-isolation source and
pre-entry binary-lock lanes. It closes the distinction between reviewed source,
installed bytes and live enforcement.

A successful live qualification requires all of the following at the same
designated host boundary:

- exact reviewed systemd unit bytes;
- exact locked 17,352-byte native pre-entry ELF;
- exact locked 17,384-byte inert training-entrypoint ELF;
- dedicated `voidapollyontrain` UID/GID;
- service initially inactive and not enabled;
- a live transition from systemd's transient executor into the exact reviewed
  training entrypoint;
- all real/effective/saved/fs UID and GID slots equal the dedicated identity;
- `NoNewPrivs=1`;
- inherited, permitted, effective, bounding and ambient capability sets all zero;
- no inherited descriptor at fd 3 or above;
- the process living in the expected system service cgroup;
- the current Linux boot ID, bound as SHA-256; and
- the live process start-time ticks from /proc/<pid>/stat field 22.

The qualifier stops the service before returning and rechecks that it did not
become enabled.

The boot-ID digest plus PID plus process start-time ticks form the downstream
generation binding. A later V2 composer must require all three to equal the
training-process generation in its custody evidence; this receipt cannot be
reused for a different start of the same unit.

## Why the exec-transition wait matters

On current Xiphos systemd, `MainPID` may briefly identify
`/usr/lib/systemd/systemd-executor` with root credentials before the configured
credential transition and final `execve()`. Sampling that transient process is
not evidence about Apollyon. The qualifier therefore waits for `/proc/<pid>/exe`
to become the exact reviewed entrypoint before reading credentials,
capabilities, descriptors or cgroup state.

## Authority boundary

The installed entrypoint is intentionally inert and ends at the durable-claim
HOLD. This qualifier contains no trainer, model-loading, corpus mutation,
candidate-weight mutation, attempt-claim writer, key/signing, wallet,
transaction or funds logic.

Even a successful live receipt reports:

```text
training_execution=false
attempt_claim=false
candidate_weight_mutation=false
service_enabled=false
service_active_after_qualification=false
```

The next source gate is a versioned preclaim successor that must compose this
receipt with the current V2 custody generation. Historical V84/V1 evidence alone
must not satisfy that successor.

## Modes

`--self-test` is inert and is what hosted CI executes.

`--live-qualify` is a separately authorized operator action. It requires root
on hostname `Xiphos`, starts only the already-installed inert qualification
service, observes the bounded live state, stops the service and emits a
content-addressed receipt.

No service enablement is performed.
