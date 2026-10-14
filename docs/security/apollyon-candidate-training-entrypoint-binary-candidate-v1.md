# Apollyon candidate-training entrypoint binary candidate v1

Marker: `VOID_APOLLYON_CANDIDATE_TRAINING_ENTRYPOINT_BINARY_CANDIDATE_V1`

Status: **source/CI-only compiled-binary candidate; unaccepted and not installed**.

## Purpose

Draft #2937 supplies reviewed source for the fixed #2918 target:

```text
/opt/void-apollyon-training-v1/apollyon_candidate_training_entrypoint_v1
```

The source is deliberately a qualification-only HOLD target. It cannot claim an
attempt or mutate model weights.

This successor derives a deterministic candidate ELF identity from that exact
source so the installed-isolation lane can eventually bind the fixed target to
reviewed bytes without introducing training authority.

This PR is stacked on exact #2937 source head
`35a86481878a0e107288b532e916e4ced1155a07` and must not land independently.

## Exact source

```text
path
ops/xiphos/apollyon_candidate_training_entrypoint_v1.c

Git blob
bfeff81f3eab98988a9be9600a05c696674c49d6
```

The deterministic compile recipe is:

```text
/usr/bin/cc
-std=c11
-O2
-Wall
-Wextra
-Werror
-D_FORTIFY_SOURCE=2
-fstack-protector-strong
-Wl,-z,relro,-z,now
-Wl,--build-id=none
```

The candidate report records compiler path/realpath, version line, target
triple and compiler version. Those are evidence, not trust in arbitrary
toolchains.

## Per-run proof

Each hosted derivation:

1. verifies the exact source Git blob and SHA-256;
2. compiles twice in a new temporary directory;
3. requires complete binary byte equality;
4. requires a direct single-link ELF bounded to 4,096..1,048,576 bytes before
   reading it into memory;
5. runs the exact #2937 source self-test transcript;
6. emits one canonical JSON candidate report bounded to 65,536 bytes; and
7. grants no binary acceptance or runtime authority.

The repaired parent arms an absolute CLOCK_BOOTTIME/TIMER_ABSTIME 300-second observation deadline before readiness. The exact self-test commits to the qualification-only boundary, including:

```text
durable_attempt_claim_proven=false
training_execution=false
candidate_weight_mutation=false
automatic_retry=false
automatic_promotion=false
deployment=false
```

## Three-run equality

The focused workflow launches three independent Ubuntu 24.04 derivations.
Only `candidate.json` is uploaded.

A compare job requires all three raw report byte strings to be identical and
then revalidates the closed report schema, current source identity, compiler
identity and content-addressed candidate ID.

Three equal reports are not accepted as proof of the binary digest by
themselves. The compare job independently recompiles the exact checked-out
source with the same reviewed recipe, performs the same two-build byte-equality
and ELF/self-test checks, and requires the locally re-derived ELF byte count and
SHA-256 to equal the hosted reports before emitting
`_THREE_RUN_GREEN`. The self-test includes three byte-identical,
schema-valid reports with one consistently forged binary SHA-256 and recomputed
candidate ID; comparison must reject them.

Validation also requires the JSON `version` field and binary byte-count field
to be actual integers; Python boolean or floating-point values that compare
equal to integers are rejected where applicable.

The candidate ID is:

```text
apollyon_candidate_training_entrypoint_binary_candidate_v1:<sha256>
```

over the complete canonical report material excluding only `candidate_id`.

## Authority boundary

A GREEN candidate remains:

```text
source_only_candidate=true
candidate_binary_identity_accepted=false
installed_training_entrypoint_identity_proven=false
live_systemd_enforcement_proven=false
inherited_system_bus_descriptor_absence_proven=false
durable_attempt_claim_proven=false
candidate_weight_mutation=false
training_execution=false
attempt_claim=false
service_action=false
host_installation=false
wallet_access=false
transaction_signing=false
funds_movement=false
```

The candidate ELF itself is not committed, installed, accepted, or executed on
Xiphos by this lane.

## Next gate

`apollyon_candidate_training_entrypoint_binary_candidate_lock_v1`

A separate reviewed lock may accept one exact three-run candidate identity as
repository evidence. Installed-host qualification remains a later gate.

No live Xiphos contact, service action, attempt claim, training, key/signing
operation, transaction, activation, wallet operation or funds movement occurs.
