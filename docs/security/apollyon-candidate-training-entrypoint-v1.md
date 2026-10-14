# Apollyon candidate-training entrypoint hold v1

Marker: `VOID_APOLLYON_CANDIDATE_TRAINING_ENTRYPOINT_HOLD_V1`

Status: **source-only fail-closed qualification target; not a trainer**.

## Purpose

Merged #2918 fixes its final `execve()` target to:

```text
/opt/void-apollyon-training-v1/apollyon_candidate_training_entrypoint_v1
```

The installed-custody observer in Draft #2935 correctly identified that the
fixed target had no reviewed repository source or accepted binary identity.

This lane supplies the first reviewed source generation for that fixed path
without prematurely importing training execution. It exists to let the
systemd/pre-entry isolation boundary be qualified independently from the later
durable attempt-claim and model-weight-mutation boundary.

## Runtime behavior

The source is intentionally inert with respect to training.

Normal invocation requires:

- a non-root stable real/effective UID and GID;
- `PR_GET_NO_NEW_PRIVS == 1`;
- no inherited descriptor at fd 3 or above; and
- no caller arguments.

After those checks it reports:

```text
status=qualification_hold_active
qualification_only=true
durable_attempt_claim_required=true
durable_attempt_claim_proven=false
training_execution_authorized=false
training_execution=false
candidate_weight_mutation=false
automatic_retry=false
automatic_promotion=false
deployment=false
network_api_authority=false
wallet_or_funds_action=false
void_chain_mutation=false
```

After identity/descriptor checks and signal setup, it captures one absolute
`CLOCK_BOOTTIME` deadline **before publishing readiness**. The deadline is
exactly 300 seconds after that admission point. The hold then uses
`clock_nanosleep(..., TIMER_ABSTIME)`; CLOCK_BOOTTIME includes host suspend
time, while the pre-ready arm means blocked output, descheduling, or suspension
after readiness cannot extend the documented window. A later, separately
authorized installed/live qualification can observe the exact systemd cgroup
and descriptor boundary during that interval. SIGTERM or SIGINT ends the
observation window early.

Every normal exit is fail-closed:

```text
HOLD=apollyon_candidate_training_entrypoint_durable_claim_gate_required
```

with exit status 2.

## Why this is not the trainer

A prior Xiphos operator successfully exercised the intended bounded training
shape, but that historical operator also owned its historical authorization and
attempt-claim mechanics. The current architecture has since split signing,
custody, live isolation and durable claim into independently reviewed gates.

Copying the historical operator wholesale into this fixed target would collapse
those gates back together. This source therefore contains no Unsloth,
Transformers, PyTorch, PEFT, corpus reader, parent-adapter loader, candidate
writer, attempt-claim writer or model-weight mutation code.

The eventual training-capable successor must consume a separately proven
durable attempt claim and preserve the reviewed bounded recipe before any model
weights can change.

## Source identity

```text
ops/xiphos/apollyon_candidate_training_entrypoint_v1.c
Git blob 73c6f623200b493dce3e1f138df1a1ade81e5350
```

The source file is repository evidence only. No executable identity is accepted
by this lane.

## Focused proof

`scripts/prove_apollyon_candidate_training_entrypoint_v1.py`:

- pins the exact source Git blob;
- compiles with the same hardened deterministic compile flags used by the
  existing Apollyon native pre-entry lineage;
- runs the source self-test;
- proves direct execution without no-new-privileges HOLDS;
- passes an inherited descriptor and proves it HOLDS;
- requires a suspend-aware absolute CLOCK_BOOTTIME 300-second deadline to be armed before readiness;
- starts the qualification target with no-new-privileges, proves it stays alive
  for observation, sends SIGTERM, and requires the durable-claim HOLD; and
- statically rejects network, subprocess/exec, filesystem-mutation and ML
  training primitives.

## Authority boundary

Even GREEN means only:

```text
source_only=true
qualification_hold_capability=true
candidate_binary_identity_accepted=false
host_installation=false
service_action=false
durable_attempt_claim_proven=false
training_execution=false
candidate_weight_mutation=false
automatic_retry=false
automatic_promotion=false
deployment=false
funds_movement=false
```

No Xiphos contact, installation, systemd action, attempt claim, training,
private-key access, signing, transaction, activation or funds movement occurs.

## Next gate

`apollyon_candidate_training_entrypoint_binary_candidate_v1`

That successor should derive a deterministic candidate ELF identity from this
exact source before Draft #2935 can bind the fixed target as installed reviewed
bytes.
