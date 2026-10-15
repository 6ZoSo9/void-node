# Buy VOID user-manager query ELF candidate v1

Marker: `VOID_BUY_VOID_USER_MANAGER_QUERY_ELF_CANDIDATE_V1`.

Status: **reproducible binary candidate only; unaccepted and uninstalled**.

## Purpose

This successor derives the two native binaries needed by the authenticated
user-manager evidence path after the static pre-exec boundary:

- the static preexec from #3040;
- the dynamic private-unit query from #3030.

Three independent Ubuntu 24.04 jobs build both with fixed compiler/linker
flags, strip them, and require exact byte equality across jobs.

## Preexec identity

The preexec is compiled with static linking, no PIE and no build ID. CI requires
that it has no PT_INTERP and that `file` identifies it as statically linked.

## Query identity

The query is built from the exact #3030 source, which embeds the root-anchored
private-peer guard. It is self-tested under the exact sanitized environment
marker before publication as candidate evidence.

## Candidate metadata

The candidate records:

- exact Git blobs for preexec, query and embedded peer-guard sources;
- SHA-256 and byte length for both ELFs;
- exact `/usr/bin/cc` and `/usr/bin/strip` SHA-256 values;
- static/no-interpreter property for the preexec;
- all authority flags false.

## Boundary

`candidate_accepted=false`

`install_authorized=false`

`complete_host_evidence_collector=false`

`payment_acceptance=false`

`public_presale_activation=false`

`funds_movement=false`

A separate acceptance lock must consume exact cross-job bytes before any
protected installation or live host use.
