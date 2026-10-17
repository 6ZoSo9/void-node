# Apollyon candidate-training preclaim v2

Marker: `VOID_APOLLYON_CANDIDATE_TRAINING_PRECLAIM_V2`

Status: **pure source-only composition; no durable claim and no training**.

## Purpose

Historical #2902 proved useful same-session mechanics, but its actual preclaim
path still executed V84/V1 custody evidence. That generation is not current
authority.

This V2 composition starts from the current V2 custody evidence and the
canonical installed/live training-isolation receipt. It supplies only the
specific service-control facts that the current V2 collector deliberately
cannot prove by observation alone.

## Same-process generation binding

The installed-isolation receipt must come from
`--observe-live-pid <pid>`, which performs no service action and leaves the
exact service generation alive.

Both raw V2 observations must bind the same:

- Xiphos boot-ID SHA-256;
- training PID;
- Linux process start-time ticks;
- training UID; and
- training GID.

The receipt must also bind the exact reviewed unit, 17,352-byte native pre-entry
ELF and 17,384-byte inert entrypoint ELF.

A PID-only match is insufficient.

## Narrow evidence promotion

Raw current V2 evidence must arrive with the deliberate unresolved state:

```text
inherited_system_bus_descriptor_absence_required=true
inherited_system_bus_descriptor_absence_proven=false
absolute_runtime_service_control_denial_proven=false
runtime_can_control_service=null
```

Only after exact same-process binding to the installed-isolation receipt does
this composer set:

```text
inherited_system_bus_descriptor_absence_proven=true
absolute_runtime_service_control_denial_proven=true
runtime_can_control_service=false
```

The augmented observations are then re-evaluated by the existing exact V2
policy and V2 two-observation live qualifier. No historical V84/V1 live
qualifier is imported or accepted.

## Remaining HOLD

Even a successful composition still reports:

```text
live_service_source_identity_proven=false
same_live_custody_session_binding_proven=false
durable_attempt_claim_performed=false
attempt_claimed=false
training_execution_authorized=false
training_execution_performed=false
```

The next gate is:

`live_custody_service_source_identity_binding_v2`

That boundary must bind the live custody service process/session to exact
reviewed launcher/source bytes before a durable claim executor can become
eligible.

No filesystem, network, service, key, wallet, signing, transaction, model,
trainer, candidate-weight or funds action exists in this contract.
