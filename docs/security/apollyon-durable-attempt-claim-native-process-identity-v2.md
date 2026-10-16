# Apollyon durable attempt-claim native process identity v2

Marker: `VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_NATIVE_PROCESS_IDENTITY_V2`

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
- the exact bounded supplementary `Groups:` set, independent of textual order;
- `/proc/<pid>/stat` start ticks before, between and after mutable identity/source observations;
- a retained pidfd that must remain live across both observation passes;
- exact executable device/inode compared with a caller-retained reviewed
  executable descriptor; and
- exact raw NUL-delimited `/proc/<pid>/cmdline` bytes.

The mutable credential/group/cmdline/executable facts are observed twice. The
second observation is followed by another PPid/start/pidfd bracket before
success. A future caller still has to recheck the retained pidfd at each later
protocol boundary; this primitive does not claim the process is immutable after
return.

The successful result returns the retained pidfd so a future service can keep
the same kernel generation pinned across later protocol boundaries.

## Hosted proof

The focused proof first compiles the production library without any test hook,
then compiles a separate synchronized self-test harness. The harness forks and
`execve()`s the exact same native executable with one exact cmdline, then proves:

- the execed child has the test parent as its direct PPid;
- PID/start, all UID/GID slots, exact supplementary groups, executable inode
  and raw cmdline are exact;
- synthetic status fixtures reject missing, extra and duplicate supplementary
  groups plus duplicate expected group IDs;
- the retained pidfd is live during observation and reports exited after the
  same child is reaped;
- a closed/invalid pidfd is an error, never an exited-process signal;
- a wrong expected parent is rejected;
- a same-executable process with the wrong expected cmdline is rejected;
- a wrong expected executable descriptor is rejected; and
- a synchronized in-place exec to `/bin/sleep` between the first and second
  source observations is rejected while PID/start/pidfd generation remains
  stable.

The harness itself accepts only `--self-test`. The reusable library contains no
`main()` and no AF_UNIX listener/client, fixed Xiphos path, store writer or
service action.

## Deliberate limits

This proof is same-UID and ephemeral. It does **not** prove cross-UID `/proc`
visibility or source observation on Xiphos. That remains a designated-host gate.

It proves the fully-native source-identity path. It does not prove source
identity for an interpreted Python/Node body; an interpreted implementation
would still need exact interpreter + raw cmdline + root-custodied script/body
identity at every #3291 revalidation boundary.

This generation is rebound to current accepted #3306 head
`7dbc421cb640edc4e39281588a22986277f517ee`. The process-identity primitive
does not absorb systemd sandbox/capability policy, inherited-FD closure,
cross-UID procfs visibility, or designated-host qualification; those remain
separate implementation/host gates.

## Authority

The library implements bounded `/proc` reads and `pidfd_open` only when a future
caller links and invokes it. It contains no filesystem mutation, socket/network
operation, service/systemd action, protected-store mutation, durable attempt
claim, training, key/signing/wallet, transaction or funds path.

Next gate remains:
`apollyon_durable_attempt_claim_store_service_source_implementation_v2`.

Keep Draft. PROTECT THE CORE.
