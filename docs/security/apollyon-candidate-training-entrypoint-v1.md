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

The first operation in `main()` establishes process safety before any
argument, identity, no-new-privileges, descriptor, or self-test path can reach a
HOLD. It blocks SIGTERM, SIGINT, and the dedicated qualification-timer signal
with `sigprocmask(SIG_BLOCK,...)`, then ignores SIGPIPE. Stderr is marked
`O_NONBLOCK` through a no-HOLD bootstrap path; only after the diagnostic
channel is safe may ordinary fail-closed helpers run while stdout is made
nonblocking. Early refusals therefore cannot be terminated by SIGPIPE, block on
a full diagnostic sink, or lose a termination signal in an asynchronous-handler
race.

After identity/descriptor checks, the target creates a POSIX timer on
`CLOCK_BOOTTIME` and arms it with `timer_settime(..., TIMER_ABSTIME,...)`
for exactly 300 seconds after admission. Before publishing readiness it performs
a zero-time `sigtimedwait()`: an already-pending SIGTERM/SIGINT causes a
fail-closed pre-ready HOLD, and the timer signal is accepted only when its
`si_code` proves kernel timer origin.

The readiness record is then emitted as one bounded `write(2)` payload rather
than buffered stdio. A full sink returns EAGAIN/EWOULDBLOCK and HOLDS
immediately; a disconnected reader returns EPIPE and is converted to a distinct
HOLD.

During the observation window the process waits synchronously with
`sigwaitinfo()` for either SIGTERM/SIGINT or the absolute CLOCK_BOOTTIME timer.
There is no asynchronous stop flag and no check-then-sleep interval: a
termination signal that becomes pending before the wait is consumed
immediately, while timer expiry remains suspend-aware because CLOCK_BOOTTIME
includes host suspend time. The timer is deleted before the final durable-claim
HOLD. CPU descheduling, suspension, blocked output, or the former
signal-before-sleep race therefore cannot extend the admitted window.

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
Git blob bfeff81f3eab98988a9be9600a05c696674c49d6
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
- proves TERM/INT/timer signals are blocked before ordinary HOLD paths, then
  SIGPIPE is ignored and stderr becomes nonblocking before stdout setup may
  call HOLD;
- proves the full process-safety call is the first operation in `main()`,
  before the first ordinary HOLD path;
- closes stderr and separately fills stderr to capacity on an early
  no-new-privileges refusal, requiring prompt exit status 2 rather than signal
  termination or blocking;
- requires an absolute CLOCK_BOOTTIME POSIX timer, pre-ready pending-signal
  rejection with `sigtimedwait()`, and synchronous `sigwaitinfo()` hold;
- statically rejects the former `stop_requested` / `clock_nanosleep()`
  check-then-sleep implementation;
- fills a pipe to capacity and proves readiness fails closed promptly rather
  than blocking beyond the observation window;
- closes the readiness pipe reader and proves SIGPIPE/EPIPE becomes a
  deterministic HOLD with exit status 2;
- starts the qualification target with no-new-privileges, proves it stays alive
  for observation, sends SIGTERM into the synchronous wait, and requires the
  durable-claim HOLD; and
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
