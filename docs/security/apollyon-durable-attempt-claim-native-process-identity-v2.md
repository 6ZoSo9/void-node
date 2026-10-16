# Apollyon durable attempt-claim native process identity v2

Marker: \`VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_NATIVE_PROCESS_IDENTITY_V2\`

Status: **source/test library only; no claim-service runtime or host installation**.

## Purpose

Accepted #3306 still leaves direct publisher→revalidator PPid lineage and exact
process source identity for a future implementation unproven. This gate adds a
small reusable Linux C observation library rather than another service or
writer.

The library can retain and validate one process generation against:

- exact PID and expected direct PPid;
- all four real/effective/saved/fs UID slots;
- all four GID slots;
- \`/proc/<pid>/stat\` start ticks before and after observation;
- a retained pidfd that must stay live across the observation;
- exact executable device/inode compared with a caller-retained reviewed
  executable descriptor; and
- exact raw NUL-delimited \`/proc/<pid>/cmdline\` bytes.

The successful result returns the retained pidfd so a future service can keep
the same kernel generation pinned across later protocol boundaries.

## Hosted proof

The focused proof compiles the library with a separate test harness. The harness
forks and \`execve()\`s the exact same native executable with one exact cmdline,
then proves:

- the execed child has the test parent as its direct PPid;
- PID/start, all UID/GID slots, executable inode and raw cmdline are exact;
- the retained pidfd is live during observation and exited after the same child
  terminates;
- a wrong expected parent is rejected;
- a same-executable process with the wrong expected cmdline is rejected; and
- a wrong expected executable descriptor is rejected.

The harness itself accepts only \`--self-test\`. The reusable library contains no
\`main()\` and no AF_UNIX listener/client, fixed Xiphos path, store writer or
service action.

## Deliberate limits

This proof is same-UID and ephemeral. It does **not** prove cross-UID \`/proc\`
visibility or source observation on Xiphos. That remains a designated-host gate.

It proves the fully-native source-identity path. It does not prove source
identity for an interpreted Python/Node body; an interpreted implementation
would still need exact interpreter + raw cmdline + root-custodied script/body
identity at every #3291 revalidation boundary.

## Authority

The library implements bounded \`/proc\` reads and \`pidfd_open\` only when a future
caller links and invokes it. It contains no filesystem mutation, socket/network
operation, service/systemd action, protected-store mutation, durable attempt
claim, training, key/signing/wallet, transaction or funds path.

Next gate remains:
\`apollyon_durable_attempt_claim_store_service_source_implementation_v2\`.

Keep Draft. PROTECT THE CORE.
