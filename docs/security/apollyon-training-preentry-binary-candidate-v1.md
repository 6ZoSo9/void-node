# Apollyon training pre-entry binary candidate v1

Marker: `VOID_APOLLYON_TRAINING_PREENTRY_BINARY_CANDIDATE_V1`

Status: **source/CI-only compiled-binary candidate derivation; unaccepted and not installed**.

## Purpose

Merged training bus-isolation source proves the reviewed C pre-entry contract,
but a C source Git blob is not an installed executable identity.

This lane derives a content-addressed ELF **candidate** from the exact merged
pre-entry source and exact reviewed compile recipe. It exists so a later,
separately reviewed lock can bind real compiled bytes before any installed-host
qualification attempts to attest the production pre-entry binary.

This lane does not accept the binary and does not install or execute it on
Xiphos.

## Exact source

The derivation pins:

```text
source path
ops/xiphos/apollyon_training_bus_isolation_preentry_v1.c

source Git blob
9503d19c8bc0b4f073ba117f6a547d339b7623d0
```

The compile command is fixed to `/usr/bin/cc` with:

```text
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

The derivation also records the compiler requested path, canonical realpath,
first version line, target triple and compiler version string.

Those compiler facts are evidence, not compiler trust or installed-host
authority.

## Per-run determinism

Each hosted derivation:

1. verifies the exact source Git blob and source SHA-256;
2. compiles the source twice in a fresh temporary directory;
3. requires the two complete ELF byte strings to be identical;
4. requires a direct single-link ELF with size in the inclusive range
   4,096..1,048,576 bytes **before reading the ELF into memory**;
5. runs `--self-test` against the candidate;
6. requires the exact reviewed self-test transcript; and
7. emits one canonical JSON candidate report no larger than 65,536 bytes.

No candidate ELF is published as an accepted installation artifact by this
lane. The report records the binary byte length and SHA-256 only.

## Three-run equality

The focused workflow launches three independent Ubuntu 24.04 derivation jobs.
Each uploads only its canonical `candidate.json` report.

A fourth job downloads all three reports, rejects any report larger than
65,536 bytes before reading it, and requires the raw JSON bytes to be identical.
It then validates a closed report schema, independently recomputes the current
source digest and compiler identity, and recomputes the candidate ID from the
canonical report material. Missing blocks, unknown fields, extra authority
claims, malformed hashes, tampered IDs, and oversized binary claims all HOLD
before it may emit:

```text
VOID_APOLLYON_TRAINING_PREENTRY_BINARY_CANDIDATE_V1_THREE_RUN_GREEN
```

A compiler/image drift that changes any recorded compiler fact, executable
bytes, self-test result, candidate ID, or report serialization therefore HOLDS
rather than being silently normalized.

## Candidate identity

The report ID is:

```text
apollyon_training_preentry_binary_candidate_v1:<sha256>
```

over the complete canonical candidate material **excluding only the
`candidate_id` field itself**. Validation requires lowercase hexadecimal and
recomputes the digest rather than trusting the supplied suffix.

A GREEN report still states:

```text
candidate_binary_identity_accepted=false
installed_preentry_binary_identity_proven=false
live_systemd_enforcement_proven=false
inherited_system_bus_descriptor_absence_proven=false
training_execution=false
attempt_claim=false
service_action=false
host_installation=false
wallet_access=false
transaction_signing=false
funds_movement=false
```

## What this does not prove

Even a byte-identical three-run candidate does **not** by itself prove:

- that the compiler/toolchain is production-approved;
- that the candidate ELF is installed anywhere;
- root ownership, mode, hard-link count or path ancestry on Xiphos;
- the installed ELF interpreter or dynamic-library closure;
- the installed systemd unit generation;
- live systemd enforcement;
- inherited system-bus descriptor absence in a real training process; or
- training/attempt authority.

Those remain later gates.

## Next gate

`apollyon_training_preentry_binary_candidate_lock_v1`

That gate may accept one exact hosted candidate report as repository evidence
only after exact-head hosted equality and review. Installed-host qualification
must remain separate and must bind the accepted executable bytes plus their
reviewed runtime/interpreter/library closure before making any live claim.

No deployment, installation, service action, key access, signing, transaction,
attempt claim, training execution or funds movement is authorized here.
